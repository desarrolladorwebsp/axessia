import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapBanchileStatusToPaymentStatus, queryBanchileSession, type BanchileSessionStatusCode } from "@/lib/services/banchile";

type NotificationBody = {
  requestId?: unknown;
  session?: { requestId?: unknown };
};

// Banchile Pagos calls this endpoint asynchronously once a Web Checkout session
// reaches a final status. The notification body isn't a signed/authenticated
// payload per the official docs available to us, so we never trust its contents
// directly: we only use it as a trigger to re-verify the real status through the
// authenticated "Consultar sesión" endpoint before updating anything.
export async function POST(request: NextRequest) {
  let body: NotificationBody = {};
  try {
    body = (await request.json()) as NotificationBody;
  } catch {
    return NextResponse.json({ received: true });
  }

  const rawRequestId = body.requestId ?? body.session?.requestId;
  if (rawRequestId === undefined || rawRequestId === null) return NextResponse.json({ received: true });

  const payment = await prisma.payment.findFirst({
    where: { provider: "BANCHILE", providerReference: String(rawRequestId) },
  });
  if (!payment || !["PENDING", "PROCESSING"].includes(payment.status) || !payment.providerReference) {
    return NextResponse.json({ received: true });
  }

  try {
    const session = await queryBanchileSession(payment.providerReference);
    const nextStatus = mapBanchileStatusToPaymentStatus(session.status.status as BanchileSessionStatusCode);
    if (nextStatus === "PROCESSING") return NextResponse.json({ received: true });

    const quoteRequest = await prisma.quoteRequest.findUnique({ where: { id: payment.requestId }, select: { status: true } });
    if (!quoteRequest) return NextResponse.json({ received: true });

    const now = new Date();
    const transaction = session.payment[0];
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: nextStatus,
          paidAt: nextStatus === "PAID" ? now : null,
          failedAt: nextStatus === "FAILED" ? now : null,
          failureReason: nextStatus === "FAILED" ? (session.status.message || "El pago fue rechazado por Banchile Pagos.") : null,
        },
      });
      await tx.quoteRequestEvent.create({
        data: {
          requestId: payment.requestId,
          status: quoteRequest.status,
          eventType: nextStatus === "PAID" ? "PAYMENT_CONFIRMED" : "PAYMENT_FAILED",
          note:
            nextStatus === "PAID"
              ? `Pago confirmado por notificación de Banchile Pagos (${transaction?.authorization ?? payment.providerReference}).`
              : session.status.message || "El pago fue rechazado por Banchile Pagos (notificación).",
        },
      });
    });
  } catch (error) {
    console.error("Error processing Banchile Pagos notification:", error);
  }

  return NextResponse.json({ received: true });
}
