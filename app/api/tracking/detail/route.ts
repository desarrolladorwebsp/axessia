import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readTrackingToken } from "@/lib/public-tracking";
import { readDevQuoteRequests, readDevQuotes, shouldUseJsonStorage } from "@/lib/dev-request-store";

function unauthorized() {
  return NextResponse.json({ error: "La sesión de seguimiento no es válida o expiró." }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const requestNumber = readTrackingToken(request.nextUrl.searchParams.get("token") ?? "");
  if (!requestNumber) return unauthorized();

  if (shouldUseJsonStorage()) {
    const record = (await readDevQuoteRequests()).find((item) => item.requestNumber === requestNumber);
    if (!record) return unauthorized();
    const quote = (await readDevQuotes())
      .filter((item) => item.requestId === record.id && item.status === "SENT")
      .sort((first, second) => second.version - first.version)[0];
    return NextResponse.json({
      requestNumber: record.requestNumber,
      requesterName: record.requesterName || record.customer?.name || "",
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      patientName: record.patientName,
      medications: record.medications.map(({ commercialName, activeIngredient, concentration, tabletQuantity }) => ({ commercialName, activeIngredient, concentration, tabletQuantity })),
      hasQuote: Boolean(quote),
      quote: quote ?? null,
    });
  }

  const record = await prisma.quoteRequest.findUnique({
    where: { requestNumber },
    select: {
      requestNumber: true,
      requesterName: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      patientName: true,
      medications: { select: { commercialName: true, activeIngredient: true, concentration: true, tabletQuantity: true } },
      quotes: {
        where: { status: "SENT" },
        orderBy: { version: "desc" },
        take: 1,
        select: {
          quoteNumber: true,
          version: true,
          status: true,
          total: true,
          validUntil: true,
          items: { select: { productName: true, activeIngredient: true, concentration: true, quantity: true, unitPrice: true, totalPrice: true } },
        },
      },
    },
  });
  if (!record?.requestNumber) return unauthorized();

  const quote = record.quotes[0];
  const isValid = Boolean(quote && (!quote.validUntil || quote.validUntil > new Date()));
  return NextResponse.json({ ...record, medications: record.medications, hasQuote: isValid, quote: isValid ? quote : null });
}
