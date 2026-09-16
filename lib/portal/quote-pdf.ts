import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/domain-error";
import { generateQuotePdf } from "@/lib/quote-pdf";
import { CUSTOMER_VISIBLE_QUOTE_STATUSES } from "@/lib/quote-status";

export async function getOwnedQuotePdfResponse(customerId: string, quoteId: string) {
  const quote = await prisma.quote.findFirst({
    where: {
      id: quoteId,
      customerId,
      status: { in: [...CUSTOMER_VISIBLE_QUOTE_STATUSES] },
    },
    select: {
      quoteNumber: true,
      version: true,
      status: true,
      createdAt: true,
      validUntil: true,
      estimatedShippingDays: true,
      total: true,
      request: { select: { requestNumber: true, customerId: true } },
      customer: { select: { name: true, email: true, rut: true, city: true, phone: true } },
      items: {
        select: {
          productType: true,
          productName: true,
          brand: true,
          model: true,
          description: true,
          activeIngredient: true,
          concentration: true,
          pharmaceuticalForm: true,
          presentation: true,
          unitsPerPackage: true,
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

  if (!quote || quote.request.customerId !== customerId) {
    throw new DomainError("Cotización no encontrada.", 404);
  }

  const pdf = await generateQuotePdf({
    quoteNumber: quote.quoteNumber ?? `Cotizacion-${quoteId}`,
    version: quote.version,
    status: quote.status,
    createdAt: quote.createdAt,
    validUntil: quote.validUntil,
    estimatedShippingDays: quote.estimatedShippingDays,
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
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Cotizacion-AXESSIA-${quote.quoteNumber ?? quoteId}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
