import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readDevQuoteRequests, readDevQuotes, writeDevQuoteRequests, writeDevQuotes, shouldUseJsonStorage } from "@/lib/dev-request-store";
import { parseQuoteItems, computeQuoteTotal, parseValidUntil, parseEstimatedShippingDays, type QuoteItemPayload } from "@/lib/quote-items";
import { isProductType } from "@/lib/product-type";
import { getInternalActor } from "@/lib/internal-access";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type QuotePayload = { validUntil?: unknown; estimatedShippingDays?: unknown; items?: unknown; asDraft?: unknown };

function invalid(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Editing is only allowed before a quote has been sent to the customer.
const editableStatuses = ["DRAFT", "READY"];

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!await getInternalActor()) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    const payload = (await request.json()) as QuotePayload;
    const asDraft = payload.asDraft === true;
    const rawItems = Array.isArray(payload.items) ? (payload.items as QuoteItemPayload[]) : [];
    if (!rawItems.length) return invalid("Agrega al menos un producto a la cotización");

    let validUntil: Date | null;
    let estimatedShippingDays: number | null;
    try {
      validUntil = parseValidUntil(payload.validUntil, asDraft);
      estimatedShippingDays = parseEstimatedShippingDays(payload.estimatedShippingDays, asDraft);
    } catch (validationError) {
      return invalid(validationError instanceof Error ? validationError.message : "Datos inválidos");
    }
    const status = asDraft ? "DRAFT" : "READY";

    if (shouldUseJsonStorage()) {
      const quotes = await readDevQuotes();
      const index = quotes.findIndex((quote) => quote.id === id);
      if (index === -1) return invalid("Cotización no encontrada", 404);
      if (!editableStatuses.includes(quotes[index].status)) return invalid("Esta cotización ya fue enviada y no puede editarse", 409);
      const requests = await readDevQuoteRequests();
      const requestType = requests.find((item) => item.id === quotes[index].requestId)?.productType;
      let items: ReturnType<typeof parseQuoteItems>;
      try {
        items = parseQuoteItems(rawItems, asDraft, isProductType(requestType) ? requestType : "MEDICATION");
      } catch (validationError) {
        return invalid(validationError instanceof Error ? validationError.message : "Datos inválidos");
      }
      const total = computeQuoteTotal(items);

      const updated = {
        ...quotes[index],
        status,
        total,
        validUntil: validUntil ? validUntil.toISOString() : null,
        estimatedShippingDays,
        items: items.map((item, itemIndex) => ({ ...item, expirationDate: item.expirationDate ? item.expirationDate.toISOString() : null, id: `dev-quote-item-${Date.now()}-${itemIndex}` })),
      } as (typeof quotes)[number];
      quotes[index] = updated;
      await writeDevQuotes(quotes);
      if (!asDraft) {
        const requestIndex = requests.findIndex((item) => item.id === updated.requestId);
        if (requestIndex >= 0 && requests[requestIndex].status !== "QUOTED") {
          const now = new Date().toISOString();
          requests[requestIndex] = {
            ...requests[requestIndex],
            status: "QUOTED",
            updatedAt: now,
            events: [{ id: `dev-event-${Date.now()}`, status: "QUOTED", eventType: "QUOTE_UPDATED", createdAt: now }, ...(requests[requestIndex].events ?? [])],
          };
          await writeDevQuoteRequests(requests);
        }
      }
      return NextResponse.json(updated);
    }

    const existing = await prisma.quote.findUnique({ where: { id }, select: { status: true, requestId: true, request: { select: { status: true, productType: true } } } });
    if (!existing) return invalid("Cotización no encontrada", 404);
    if (!editableStatuses.includes(existing.status)) return invalid("Esta cotización ya fue enviada y no puede editarse", 409);
    let items: ReturnType<typeof parseQuoteItems>;
    try {
      items = parseQuoteItems(rawItems, asDraft, existing.request.productType);
    } catch (validationError) {
      return invalid(validationError instanceof Error ? validationError.message : "Datos inválidos");
    }
    const total = computeQuoteTotal(items);

    const quote = await prisma.$transaction(async (transaction) => {
      await transaction.quoteItem.deleteMany({ where: { quoteId: id } });
      const updated = await transaction.quote.update({
        where: { id },
        data: { status, total, validUntil, estimatedShippingDays, items: { create: items } },
        include: { items: true, customer: { select: { id: true, name: true, email: true } }, request: { select: { id: true, requestNumber: true, requesterName: true, requesterEmail: true } } },
      });
      if (!asDraft && existing.request.status !== "QUOTED") {
        await transaction.quoteRequest.update({ where: { id: existing.requestId }, data: { status: "QUOTED" } });
        await transaction.quoteRequestEvent.create({ data: { requestId: existing.requestId, status: "QUOTED", eventType: "QUOTE_UPDATED" } });
      }
      return updated;
    });

    return NextResponse.json({
      ...quote,
      total: quote.total?.toString() ?? null,
      validUntil: quote.validUntil?.toISOString() ?? null,
      createdAt: quote.createdAt.toISOString(),
      updatedAt: quote.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating quote:", error);
    return invalid("No fue posible guardar los cambios de la cotización", 500);
  }
}
