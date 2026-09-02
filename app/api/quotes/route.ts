import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readDevQuotes, readDevQuoteRequests, shouldUseJsonStorage, writeDevQuotes, writeDevQuoteRequests, type DevQuoteRecord } from "@/lib/dev-request-store";
import { parseQuoteItems, computeQuoteTotal, parseValidUntil, type QuoteItemPayload } from "@/lib/quote-items";
import { normalizeSearchValue } from "@/lib/search";
import { getInternalActor } from "@/lib/internal-access";

const quoteStatuses = ["DRAFT", "READY", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "VOIDED"] as const;

type QuotePayload = { requestId?: unknown; validUntil?: unknown; items?: unknown; asDraft?: unknown };

function invalid(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  if (!await getInternalActor()) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const payload = (await request.json()) as QuotePayload;
    const asDraft = payload.asDraft === true;
    const requestId = typeof payload.requestId === "string" ? payload.requestId.trim() : "";
    const rawItems = Array.isArray(payload.items) ? payload.items as QuoteItemPayload[] : [];
    if (!requestId) return invalid("La solicitud es obligatoria");
    if (!rawItems.length) return invalid("Agrega al menos un producto a la cotización");

    let validUntil: Date | null;
    let items: ReturnType<typeof parseQuoteItems>;
    try {
      validUntil = parseValidUntil(payload.validUntil, asDraft);
      items = parseQuoteItems(rawItems, asDraft);
    } catch (validationError) {
      return invalid(validationError instanceof Error ? validationError.message : "Datos inválidos");
    }
    const total = computeQuoteTotal(items);
    const status = asDraft ? "DRAFT" : "READY";

    if (shouldUseJsonStorage()) {
      const requests = await readDevQuoteRequests();
      const recordIndex = requests.findIndex((record) => record.id === requestId);
      if (recordIndex === -1) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
      const source = requests[recordIndex];
      const customerId = source.customerId ?? source.customer?.id ?? `dev-customer-${source.id}`;
      const customer = source.customer ?? { id: customerId, name: source.requesterName, phone: source.requesterPhone, email: source.requesterEmail, rut: source.requesterRut, city: source.requesterCity };
      const quotes = await readDevQuotes();
      const sequence = quotes.reduce((highest, quote) => Math.max(highest, quote.sequence), 0) + 1;
      const now = new Date().toISOString();
      const quote: DevQuoteRecord = { id: `dev-quote-${Date.now()}`, sequence, quoteNumber: `C-${10000 + sequence}`, customerId, requestId, customer, request: { id: source.id, requestNumber: source.requestNumber, requesterName: source.requesterName, requesterEmail: source.requesterEmail }, version: quotes.filter((item) => item.requestId === requestId).length + 1, status, total, validUntil: validUntil ? validUntil.toISOString() : null, createdAt: now, sentAt: null, items: items.map((item, index) => ({ ...item, expirationDate: item.expirationDate ? item.expirationDate.toISOString() : null, id: `dev-quote-item-${Date.now()}-${index}` })) };
      await writeDevQuotes([quote, ...quotes]);
      requests[recordIndex] = {
        ...source,
        customerId,
        customer,
        status: asDraft ? source.status : "QUOTED",
        updatedAt: now,
        events: asDraft || source.status === "QUOTED"
          ? source.events
          : [{ id: `dev-event-${Date.now()}`, status: "QUOTED", eventType: "QUOTE_CREATED", createdAt: now }, ...(source.events ?? [])],
      };
      await writeDevQuoteRequests(requests);
      return NextResponse.json(quote, { status: 201 });
    }

    const quote = await prisma.$transaction(async (transaction) => {
      const source = await transaction.quoteRequest.findUnique({ where: { id: requestId }, select: { id: true, status: true, customerId: true, requesterName: true, requesterPhone: true, requesterEmail: true, requesterRut: true, requesterCity: true } });
      if (!source) throw new Error("Solicitud no encontrada");
      if (!["RECEIVED", "SOURCING", "QUOTED", "AWAITING_DECISION"].includes(source.status)) throw new Error("La solicitud no está disponible para crear una cotización");
      let customerId = source.customerId;
      if (!customerId) {
        const existingCustomer = await transaction.customer.findFirst({ where: { OR: [{ email: source.requesterEmail }, { rut: source.requesterRut }] }, select: { id: true } });
        customerId = existingCustomer?.id ?? (await transaction.customer.create({ data: { name: source.requesterName, phone: source.requesterPhone, email: source.requesterEmail, rut: source.requesterRut, city: source.requesterCity }, select: { id: true } })).id;
        await transaction.quoteRequest.update({ where: { id: requestId }, data: { customerId } });
      }
      const latest = await transaction.quote.findFirst({ where: { requestId }, orderBy: { version: "desc" }, select: { version: true } });
      const created = await transaction.quote.create({ data: { customerId, requestId, version: (latest?.version ?? 0) + 1, status, total, validUntil, items: { create: items } }, include: { items: true, customer: { select: { id: true, name: true, email: true } }, request: { select: { id: true, requestNumber: true, requesterName: true, requesterEmail: true } } } });
      const numbered = await transaction.quote.update({ where: { id: created.id }, data: { quoteNumber: `C-${10000 + created.sequence}` }, include: { items: true, customer: { select: { id: true, name: true, email: true } }, request: { select: { id: true, requestNumber: true, requesterName: true, requesterEmail: true } } } });
      if (!asDraft) {
        await transaction.quoteRequest.update({ where: { id: requestId }, data: { status: "QUOTED" } });
        await transaction.quoteRequestEvent.create({ data: { requestId, status: "QUOTED", eventType: "QUOTE_CREATED" } });
      }
      return numbered;
    }, { maxWait: 10000, timeout: 20000 });
    return NextResponse.json({ ...quote, total: quote.total?.toString() ?? null, validUntil: quote.validUntil?.toISOString() ?? null, createdAt: quote.createdAt.toISOString(), updatedAt: quote.updatedAt.toISOString() }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && (error.message === "Solicitud no encontrada" || error.message.startsWith("Producto") || error.message === "La solicitud no está disponible para crear una cotización")) return NextResponse.json({ error: error.message }, { status: error.message === "Solicitud no encontrada" ? 404 : error.message === "La solicitud no está disponible para crear una cotización" ? 409 : 400 });
    console.error("Error creating quote:", error);
    return NextResponse.json({ error: "Error al crear la cotización" }, { status: 500 });
  }
}

type QuoteStatusValue = (typeof quoteStatuses)[number];

export async function GET(request: NextRequest) {
  if (!await getInternalActor()) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const searchParams = request.nextUrl.searchParams;
  const requestedPage = Number.parseInt(searchParams.get("page") || "1", 10);
  const requestedLimit = Number.parseInt(searchParams.get("limit") || "10", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 10;
  const statusParam = searchParams.get("status");
  const status = quoteStatuses.includes(statusParam as QuoteStatusValue) ? (statusParam as QuoteStatusValue) : undefined;
  const rawQuery = searchParams.get("q") ?? "";
  const normalizedQuery = normalizeSearchValue(rawQuery);

  try {
    if (shouldUseJsonStorage()) {
      const storedQuotes = await readDevQuotes();
      const filteredQuotes = status ? storedQuotes.filter((quote) => quote.status === status) : storedQuotes;
      return NextResponse.json({
        quotes: filteredQuotes.slice((page - 1) * limit, page * limit),
        pagination: { total: filteredQuotes.length, page, limit, pages: Math.ceil(filteredQuotes.length / limit) },
      });
    }

    const where = {
      ...(status ? { status } : {}),
      ...(normalizedQuery
        ? {
            OR: [
              { quoteNumber: { contains: normalizedQuery } },
              { request: { is: { requestNumber: { contains: normalizedQuery } } } },
              { request: { is: { requesterName: { contains: normalizedQuery } } } },
              { request: { is: { requesterEmail: { contains: normalizedQuery } } } },
              { request: { is: { customer: { is: { name: { contains: normalizedQuery } } } } } },
              { request: { is: { customer: { is: { email: { contains: normalizedQuery } } } } } },
            ],
          }
        : {}),
    };
    const [quotes, total, statusSummary] = await Promise.all([
      prisma.quote.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          quoteNumber: true,
          version: true,
          status: true,
          total: true,
          validUntil: true,
          createdAt: true,
          sentAt: true,
          request: {
            select: {
              id: true,
              requestNumber: true,
              requesterName: true,
              requesterEmail: true,
              customer: { select: { name: true, email: true } },
            },
          },
          items: { select: { productName: true, quantity: true } },
        },
      }),
      prisma.quote.count({ where }),
      prisma.quote.groupBy({ by: ["status"], _count: { status: true }, where }),
    ]);

    const statusCounts = Object.fromEntries(statusSummary.map((item) => [item.status, item._count.status]));
    const summary = {
      totalQuotes: total,
      sent: statusCounts.SENT ?? 0,
      accepted: statusCounts.ACCEPTED ?? 0,
      pending: (statusCounts.DRAFT ?? 0) + (statusCounts.READY ?? 0),
      draft: statusCounts.DRAFT ?? 0,
      ready: statusCounts.READY ?? 0,
      rejected: statusCounts.REJECTED ?? 0,
      expired: statusCounts.EXPIRED ?? 0,
      voided: statusCounts.VOIDED ?? 0,
    };

    return NextResponse.json({
      quotes: quotes.map((quote) => ({
        ...quote,
        total: quote.total?.toString() ?? null,
        validUntil: quote.validUntil?.toISOString() ?? null,
        createdAt: quote.createdAt.toISOString(),
        sentAt: quote.sentAt?.toISOString() ?? null,
      })),
      summary,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return NextResponse.json({ error: "Error al obtener cotizaciones" }, { status: 500 });
  }
}
