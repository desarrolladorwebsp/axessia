import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readTrackingToken } from "@/lib/public-tracking";
import { DomainError, isDomainError } from "@/lib/domain-error";
import { decideQuote, pickAcceptedQuote, pickDecisionQuote } from "@/lib/quote-decision";
import {
  advanceWithoutPayment,
  completeSimulatedPayment,
  confirmPayment,
  requestPaymentHelp,
  startPayment,
} from "@/lib/payment-flow";
import { getAppBaseUrl } from "@/lib/app-url";

type Action =
  | "accept"
  | "reject"
  | "comment"
  | "start_payment"
  | "confirm_payment"
  | "complete_payment"
  | "advance_without_payment"
  | "payment_help";

type Body = {
  token?: unknown;
  action?: unknown;
  comment?: unknown;
  outcome?: unknown;
  paymentId?: unknown;
  message?: unknown;
};

function invalid(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function parseAction(value: unknown): Action | null {
  if (
    value === "accept" ||
    value === "reject" ||
    value === "comment" ||
    value === "start_payment" ||
    value === "confirm_payment" ||
    value === "complete_payment" ||
    value === "advance_without_payment" ||
    value === "payment_help"
  ) {
    return value;
  }
  return null;
}

function handleError(error: unknown) {
  if (isDomainError(error) || error instanceof DomainError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("Tracking action error:", error);
  return NextResponse.json({ error: "No fue posible completar la acción." }, { status: 500 });
}

async function loadAuthorizedRequest(requestNumber: string) {
  return prisma.quoteRequest.findUnique({
    where: { requestNumber },
    select: {
      id: true,
      requestNumber: true,
      status: true,
      requesterName: true,
      requesterEmail: true,
      quotes: {
        orderBy: { version: "desc" },
        take: 5,
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          total: true,
          items: { select: { totalPrice: true } },
          validUntil: true,
          version: true,
        },
      },
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const requestNumber = typeof body.token === "string" ? readTrackingToken(body.token) : null;
    const action = parseAction(body.action);
    const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 2000) : "";
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
    const paymentId = typeof body.paymentId === "string" ? body.paymentId.trim() : "";
    const outcome =
      body.outcome === "success" || body.outcome === "failure" || body.outcome === "cancel"
        ? body.outcome
        : null;

    if (!requestNumber || !action) return invalid("La acción no es válida.");

    const record = await loadAuthorizedRequest(requestNumber);
    if (!record?.requestNumber) return NextResponse.json({ error: "La sesión de seguimiento no es válida." }, { status: 401 });

    if (action === "comment") {
      if (!comment) return invalid("Escribe un comentario antes de enviarlo.");
      const quote = pickDecisionQuote(record.quotes) ?? pickAcceptedQuote(record.quotes);
      await prisma.$transaction([
        prisma.quoteRequestComment.create({
          data: {
            requestId: record.id,
            quoteId: quote?.id,
            authorType: "CUSTOMER",
            message: comment,
          },
        }),
        prisma.quoteRequestEvent.create({
          data: {
            requestId: record.id,
            status: record.status,
            eventType: "CUSTOMER_COMMENT",
            note: comment,
          },
        }),
      ]);
      return NextResponse.json({ status: record.status });
    }

    if (action === "accept" || action === "reject") {
      const quote = pickDecisionQuote(record.quotes);
      if (!quote) return invalid("Esta cotización ya no está disponible para decisión.", 409);
      const result = await decideQuote({
        request: record,
        quote,
        action,
        comment,
      });
      return NextResponse.json(result);
    }

    const acceptedQuote = pickAcceptedQuote(record.quotes);

    if (action === "advance_without_payment") {
      return NextResponse.json(await advanceWithoutPayment(record, acceptedQuote));
    }

    if (action === "start_payment") {
      const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "127.0.0.1";
      const userAgent = request.headers.get("user-agent") || "AXESSIA Tracking";
      const returnUrl = `${getAppBaseUrl()}/seguimiento/${encodeURIComponent(record.requestNumber)}?payment=return`;
      return NextResponse.json(await startPayment({
        request: record,
        quote: acceptedQuote,
        ipAddress,
        userAgent,
        returnUrl,
      }));
    }

    if (action === "confirm_payment") {
      return NextResponse.json(await confirmPayment({
        request: record,
        quote: acceptedQuote,
        paymentId: paymentId || undefined,
      }));
    }

    if (action === "complete_payment") {
      if (!paymentId) return invalid("Falta el identificador del pago.");
      if (!outcome) return invalid("Indica el resultado del pago.");
      return NextResponse.json(await completeSimulatedPayment({
        request: record,
        quote: acceptedQuote,
        paymentId,
        outcome,
      }));
    }

    if (action === "payment_help") {
      return NextResponse.json(await requestPaymentHelp({
        request: record,
        quote: acceptedQuote,
        paymentId: paymentId || undefined,
        message,
      }));
    }

    return invalid("La acción no es válida.");
  } catch (error) {
    return handleError(error);
  }
}
