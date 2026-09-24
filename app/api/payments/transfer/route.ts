import { NextRequest, NextResponse } from "next/server";
import { getPortalCustomer } from "@/lib/customer-access";
import { DomainError } from "@/lib/domain-error";
import { createStoredDocument, DocumentServiceError, serializeStoredDocument } from "@/lib/documents/file-service";
import { quotePriceBreakdownFromItems } from "@/lib/quote-pricing";
import { readTrackingToken } from "@/lib/public-tracking";
import { prisma } from "@/lib/prisma";

function errorResponse(error: unknown) {
  if (error instanceof DocumentServiceError || error instanceof DomainError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("Error uploading transfer receipt:", error);
  return NextResponse.json({ error: "No fue posible registrar el comprobante de transferencia." }, { status: 500 });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const requestIdValue = formData.get("requestId");
    const tokenValue = formData.get("token");
    const requestId = typeof requestIdValue === "string" ? requestIdValue.trim() : "";
    const trackingRequestNumber = typeof tokenValue === "string" ? readTrackingToken(tokenValue) : null;
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: "Selecciona un comprobante válido." }, { status: 400 });
    }

    const customer = await getPortalCustomer();
    const requestRecord = trackingRequestNumber
      ? await prisma.quoteRequest.findUnique({ where: { requestNumber: trackingRequestNumber }, select: { id: true, customerId: true, status: true, requestNumber: true, quotes: { where: { status: "ACCEPTED" }, orderBy: { version: "desc" }, take: 1, select: { id: true, total: true, items: { select: { totalPrice: true } } } } } })
      : customer && requestId
        ? await prisma.quoteRequest.findFirst({ where: { id: requestId, customerId: customer.id }, select: { id: true, customerId: true, status: true, requestNumber: true, quotes: { where: { status: "ACCEPTED" }, orderBy: { version: "desc" }, take: 1, select: { id: true, total: true, items: { select: { totalPrice: true } } } } } })
        : null;

    if (!requestRecord) return NextResponse.json({ error: "No encontramos la solicitud asociada." }, { status: 404 });
    if (requestRecord.status !== "ACCEPTED") {
      return NextResponse.json({ error: "La solicitud debe tener una cotización aceptada y estar pendiente de pago." }, { status: 409 });
    }
    const acceptedQuote = requestRecord.quotes[0];
    if (!acceptedQuote) return NextResponse.json({ error: "No encontramos una cotización aceptada para esta solicitud." }, { status: 409 });

    const breakdown = quotePriceBreakdownFromItems(acceptedQuote.items);
    const amount = breakdown.total;
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "La cotización no tiene un total válido para registrar el pago." }, { status: 409 });

    const document = await createStoredDocument("client-documents", requestRecord.id, file, {
      customerId: requestRecord.customerId,
      documentKind: "TRANSFER_RECEIPT",
      customLabel: "Comprobante de transferencia",
    });

    try {
      const existingPayment = await prisma.payment.findFirst({
        where: { requestId: requestRecord.id, quoteId: acceptedQuote.id, provider: "TRANSFER", status: { in: ["PENDING", "PROCESSING"] } },
        orderBy: { createdAt: "desc" },
      });
      const payment = existingPayment ?? await prisma.payment.create({
        data: { requestId: requestRecord.id, quoteId: acceptedQuote.id, amount, currency: "CLP", status: "PENDING", provider: "TRANSFER" },
      });
      await prisma.quoteRequestEvent.create({
        data: {
          requestId: requestRecord.id,
          status: requestRecord.status,
          eventType: "TRANSFER_RECEIPT_UPLOADED",
          note: `Comprobante de transferencia adjunto: ${document.fileName}`,
        },
      });
      return NextResponse.json({ ok: true, payment: { id: payment.id, status: payment.status, amount: payment.amount.toString(), currency: payment.currency }, document: serializeStoredDocument(document) }, { status: 201 });
    } catch (error) {
      if (document.storageKey) {
        // The database write failed after the file was stored. Keep the request retryable.
        console.error("Transfer receipt metadata could not be persisted:", error);
      }
      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
}
