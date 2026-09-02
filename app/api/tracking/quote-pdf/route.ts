import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readTrackingToken } from "@/lib/public-tracking";
import { generateQuotePdf } from "@/lib/quote-pdf";

function unauthorized() {
  return NextResponse.json({ error: "La sesión de seguimiento no es válida o expiró." }, { status: 401 });
}

// Lets a tracked customer download only the quote already sent for their own request.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const requestNumber = readTrackingToken(searchParams.get("token") ?? "");
  if (!requestNumber) return unauthorized();
  const quoteId = searchParams.get("quoteId") ?? "";
  if (!quoteId) return NextResponse.json({ error: "Cotización no encontrada." }, { status: 404 });

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: {
      quoteNumber: true,
      version: true,
      status: true,
      createdAt: true,
      validUntil: true,
      total: true,
      request: { select: { requestNumber: true } },
      customer: { select: { name: true, email: true, rut: true, city: true, phone: true } },
      items: {
        select: {
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
  });
  if (!quote || quote.request.requestNumber !== requestNumber) return NextResponse.json({ error: "Cotización no encontrada." }, { status: 404 });
  if (quote.status === "DRAFT") return NextResponse.json({ error: "La cotización no está disponible." }, { status: 409 });

  const pdf = await generateQuotePdf({
    quoteNumber: quote.quoteNumber ?? `Borrador-${quoteId}`,
    version: quote.version,
    status: quote.status,
    createdAt: quote.createdAt,
    validUntil: quote.validUntil,
    total: quote.total?.toString() ?? null,
    requestNumber: quote.request.requestNumber,
    customer: quote.customer,
    items: quote.items.map((item) => ({
      ...item,
      unitPrice: item.unitPrice?.toString() ?? null,
      totalPrice: item.totalPrice?.toString() ?? null,
    })),
  });
  const body = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
  return new NextResponse(body, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="Cotizacion-AXESSIA-${quote.quoteNumber ?? quoteId}.pdf"` } });
}
