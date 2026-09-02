import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readTrackingToken } from "@/lib/public-tracking";
import { serializePayment } from "@/lib/payments";

function unauthorized() {
  return NextResponse.json({ error: "La sesión de seguimiento no es válida o expiró." }, { status: 401 });
}

function money(value: { toString(): string } | number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  return value.toString();
}

export async function GET(request: NextRequest) {
  const requestNumber = readTrackingToken(request.nextUrl.searchParams.get("token") ?? "");
  if (!requestNumber) return unauthorized();

  const record = await prisma.quoteRequest.findUnique({
    where: { requestNumber },
    select: {
      id: true,
      requestNumber: true,
      requesterName: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      patientName: true,
      medications: {
        select: {
          commercialName: true,
          activeIngredient: true,
          concentration: true,
          tabletQuantity: true,
        },
      },
      quotes: {
        orderBy: { version: "desc" },
        take: 3,
        select: {
          id: true,
          quoteNumber: true,
          version: true,
          status: true,
          total: true,
          validUntil: true,
          acceptedAt: true,
          sentAt: true,
          items: {
            select: {
              id: true,
              productName: true,
              activeIngredient: true,
              concentration: true,
              pharmaceuticalForm: true,
              presentation: true,
              unitsPerPackage: true,
              manufacturer: true,
              originCountry: true,
              supplierCountry: true,
              quantity: true,
              sanitaryRegistry: true,
              condition: true,
              batchNumber: true,
              expirationDate: true,
              unitPrice: true,
              totalPrice: true,
            },
          },
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!record?.requestNumber) return unauthorized();

  const decisionQuote =
    record.quotes.find((quote) => quote.status === "SENT") ??
    record.quotes.find((quote) => quote.status === "ACCEPTED") ??
    record.quotes.find((quote) => quote.status === "REJECTED") ??
    null;

  const now = new Date();
  const quoteExpired = Boolean(decisionQuote?.validUntil && decisionQuote.validUntil < now && decisionQuote.status === "SENT");
  const canDecide = record.status === "AWAITING_DECISION" && decisionQuote?.status === "SENT" && !quoteExpired;
  const canContinueAfterAccept = record.status === "ACCEPTED" && decisionQuote?.status === "ACCEPTED";
  const latestPayment = record.payments[0] ? serializePayment(record.payments[0]) : null;
  const hasPaid = record.payments.some((payment) => payment.status === "PAID");

  const quote = decisionQuote
    ? {
        id: decisionQuote.id,
        quoteNumber: decisionQuote.quoteNumber,
        version: decisionQuote.version,
        status: quoteExpired ? "EXPIRED" : decisionQuote.status,
        total: money(decisionQuote.total),
        validUntil: decisionQuote.validUntil?.toISOString() ?? null,
        acceptedAt: decisionQuote.acceptedAt?.toISOString() ?? null,
        sentAt: decisionQuote.sentAt?.toISOString() ?? null,
        expired: quoteExpired,
        items: decisionQuote.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          activeIngredient: item.activeIngredient,
          concentration: item.concentration,
          pharmaceuticalForm: item.pharmaceuticalForm,
          presentation: item.presentation,
          unitsPerPackage: item.unitsPerPackage,
          manufacturer: item.manufacturer,
          originCountry: item.originCountry,
          supplierCountry: item.supplierCountry,
          quantity: item.quantity,
          sanitaryRegistry: item.sanitaryRegistry,
          condition: item.condition,
          batchNumber: item.batchNumber,
          expirationDate: item.expirationDate?.toISOString() ?? null,
          unitPrice: money(item.unitPrice),
          totalPrice: money(item.totalPrice),
        })),
      }
    : null;

  return NextResponse.json({
    requestNumber: record.requestNumber,
    requesterName: record.requesterName,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    patientName: record.patientName,
    medications: record.medications,
    hasQuote: Boolean(quote),
    canDecide,
    canContinueAfterAccept,
    paymentRequired: canContinueAfterAccept && !hasPaid,
    canPay: canContinueAfterAccept && !hasPaid,
    canAdvanceWithoutPayment: canContinueAfterAccept && !hasPaid,
    quote,
    payment: latestPayment,
    payments: record.payments.map(serializePayment),
  });
}
