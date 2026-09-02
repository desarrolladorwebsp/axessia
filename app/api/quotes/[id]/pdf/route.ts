import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInternalActor } from "@/lib/internal-access";
import { generateQuotePdf } from "@/lib/quote-pdf";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  if (!await getInternalActor()) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    select: {
      quoteNumber: true,
      version: true,
      status: true,
      createdAt: true,
      validUntil: true,
      total: true,
      customer: { select: { name: true, email: true, rut: true, city: true, phone: true } },
      request: { select: { requestNumber: true } },
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
  if (!quote) return NextResponse.json({ error: "Cotización no encontrada." }, { status: 404 });
  const pdf = await generateQuotePdf({
    quoteNumber: quote.quoteNumber ?? `Borrador-${id}`,
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
  return new NextResponse(body, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="Cotizacion-AXESSIA-${quote.quoteNumber ?? id}.pdf"` } });
}