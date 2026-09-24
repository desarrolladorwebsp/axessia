import { DomainError } from "@/lib/domain-error";
import { serializeDocumentMeta } from "@/lib/documents/file-service";
import { resolveClientDocumentLabel } from "@/lib/client-document-type";
import { serializePayment } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { CUSTOMER_VISIBLE_QUOTE_STATUSES } from "@/lib/quote-status";
import { OPEN_REQUEST_STATUSES } from "@/lib/customer-status";
import { paginationMeta, PORTAL_PAGE_SIZE, parsePage } from "@/lib/portal/pagination";
import { iso, serializeMoney } from "@/lib/portal/serialize";
import { formatEstimatedShippingDays } from "@/lib/quote-items";
import { quotePriceBreakdownFromItems } from "@/lib/quote-pricing";
import { REQUEST_STATUS_DESCRIPTIONS, REQUEST_STATUS_LABELS } from "@/lib/request-status";
import { parsePortalProfileUpdate, profileUpdateChanged, type PortalProfileUpdateInput } from "@/lib/portal/profile";
import { scopedToCustomer, ownedResourceWhere } from "@/lib/portal/scope";
import { summarizeRequestProducts } from "@/lib/portal/request-summary";
import type { PortalCustomer } from "@/lib/customer-access";
import type { ClientDocumentKind } from "@/lib/client-document-type";

const quoteItemSelect = {
  id: true,
  productType: true,
  productName: true,
  activeIngredient: true,
  concentration: true,
  pharmaceuticalForm: true,
  brand: true,
  model: true,
  description: true,
  presentation: true,
  unitsPerPackage: true,
  quantity: true,
  sanitaryRegistry: true,
  condition: true,
  batchNumber: true,
  expirationDate: true,
  unitPrice: true,
  totalPrice: true,
} as const;

function serializeQuoteItem(item: {
  id: string;
  productType: string;
  productName: string;
  activeIngredient: string | null;
  concentration: string | null;
  pharmaceuticalForm: string | null;
  brand: string | null;
  model: string | null;
  description: string | null;
  presentation: string | null;
  unitsPerPackage: number | null;
  quantity: number;
  sanitaryRegistry: string | null;
  condition: string | null;
  batchNumber: string | null;
  expirationDate: Date | null;
  unitPrice: { toString(): string } | null;
  totalPrice: { toString(): string } | null;
}) {
  return {
    id: item.id,
    productType: item.productType,
    productName: item.productName,
    activeIngredient: item.activeIngredient,
    concentration: item.concentration,
    pharmaceuticalForm: item.pharmaceuticalForm,
    brand: item.brand,
    model: item.model,
    description: item.description,
    presentation: item.presentation,
    unitsPerPackage: item.unitsPerPackage,
    quantity: item.quantity,
    sanitaryRegistry: item.sanitaryRegistry,
    condition: item.condition,
    batchNumber: item.batchNumber,
    expirationDate: iso(item.expirationDate),
    unitPrice: serializeMoney(item.unitPrice),
    totalPrice: serializeMoney(item.totalPrice),
  };
}

function visibleQuoteWhere(customerId: string) {
  return {
    ...scopedToCustomer(customerId),
    status: { in: [...CUSTOMER_VISIBLE_QUOTE_STATUSES] },
  };
}

function quoteExpired(status: string, validUntil: Date | null, now = new Date()) {
  return Boolean(validUntil && validUntil < now && status === "SENT");
}

export async function getPortalDashboard(customerId: string) {
  const [requestCount, openRequestCount, quoteCount, latestRequests, awaitingQuotes] = await Promise.all([
    prisma.quoteRequest.count({ where: scopedToCustomer(customerId) }),
    prisma.quoteRequest.count({ where: { ...scopedToCustomer(customerId), status: { in: [...OPEN_REQUEST_STATUSES] } } }),
    prisma.quote.count({ where: visibleQuoteWhere(customerId) }),
    prisma.quoteRequest.findMany({
      where: scopedToCustomer(customerId),
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: {
        id: true,
        requestNumber: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        productType: true,
      },
    }),
    prisma.quote.findMany({
      where: { ...scopedToCustomer(customerId), status: "SENT", request: { status: "AWAITING_DECISION", ...scopedToCustomer(customerId) } },
      orderBy: { sentAt: "desc" },
      take: 3,
      select: {
        id: true,
        quoteNumber: true,
        version: true,
        total: true,
        validUntil: true,
        requestId: true,
        request: { select: { requestNumber: true, status: true } },
        items: { select: { totalPrice: true } },
      },
    }),
  ]);

  return {
    summary: {
      requestCount,
      openRequestCount,
      quoteCount,
      awaitingDecisionCount: awaitingQuotes.length,
    },
    latestRequests: latestRequests.map((request) => ({
      id: request.id,
      requestNumber: request.requestNumber,
      status: request.status,
      statusLabel: REQUEST_STATUS_LABELS[request.status] || request.status,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      productType: request.productType,
    })),
    awaitingQuotes: awaitingQuotes.map((quote) => ({
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      version: quote.version,
      total: quotePriceBreakdownFromItems(quote.items).total.toString(),
      validUntil: iso(quote.validUntil),
      requestId: quote.requestId,
      requestNumber: quote.request.requestNumber,
      expired: quoteExpired("SENT", quote.validUntil),
    })),
  };
}

export async function listPortalRequests(customerId: string, pageValue?: string | null) {
  const page = parsePage(pageValue);
  const where = scopedToCustomer(customerId);
  const [total, requests] = await Promise.all([
    prisma.quoteRequest.count({ where }),
    prisma.quoteRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PORTAL_PAGE_SIZE,
      take: PORTAL_PAGE_SIZE,
      select: {
        id: true,
        requestNumber: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        productType: true,
        patientName: true,
        medications: { select: { commercialName: true }, take: 3 },
        medicalDevices: { select: { name: true }, take: 3 },
        quotes: {
          where: { status: { in: [...CUSTOMER_VISIBLE_QUOTE_STATUSES] } },
          orderBy: { version: "desc" },
          take: 1,
          select: { quoteNumber: true, status: true, total: true, validUntil: true, items: { select: { totalPrice: true } } },
        },
      },
    }),
  ]);

  return {
    requests: requests.map((request) => ({
      id: request.id,
      requestNumber: request.requestNumber,
      status: request.status,
      statusLabel: REQUEST_STATUS_LABELS[request.status] || request.status,
      statusDescription: REQUEST_STATUS_DESCRIPTIONS[request.status] || "",
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      productType: request.productType,
      patientName: request.patientName,
      productSummary: summarizeRequestProducts(request),
      quote: request.quotes[0]
        ? {
            quoteNumber: request.quotes[0].quoteNumber,
            status: quoteExpired(request.quotes[0].status, request.quotes[0].validUntil) ? "EXPIRED" : request.quotes[0].status,
            total: quotePriceBreakdownFromItems(request.quotes[0].items).total.toString(),
          }
        : null,
    })),
    pagination: paginationMeta(total, page),
  };
}

export async function getPortalRequestDetail(customerId: string, requestId: string) {
  const record = await prisma.quoteRequest.findFirst({
    where: ownedResourceWhere(customerId, requestId),
    select: {
      id: true,
      requestNumber: true,
      requesterName: true,
      requesterEmail: true,
      requesterPhone: true,
      requesterCity: true,
      patientName: true,
      patientRut: true,
      status: true,
      productType: true,
      createdAt: true,
      updatedAt: true,
      medications: {
        select: {
          commercialName: true,
          activeIngredient: true,
          concentration: true,
          tabletQuantity: true,
          notes: true,
        },
      },
      medicalDevices: {
        select: {
          name: true,
          brand: true,
          model: true,
          quantity: true,
          description: true,
        },
      },
        quotes: {
          where: { status: { in: [...CUSTOMER_VISIBLE_QUOTE_STATUSES] } },
          orderBy: { version: "desc" },
          select: {
            id: true,
            quoteNumber: true,
            version: true,
            status: true,
            total: true,
            validUntil: true,
            estimatedShippingDays: true,
            sentAt: true,
            acceptedAt: true,
            createdAt: true,
            items: { select: quoteItemSelect },
          },
        },
      prescriptions: {
        orderBy: { createdAt: "desc" },
        select: { id: true, fileName: true, mimeType: true, fileSize: true, storageKey: true, createdAt: true },
      },
      clientDocuments: {
        orderBy: { createdAt: "desc" },
        select: { id: true, fileName: true, mimeType: true, fileSize: true, storageKey: true, documentKind: true, customLabel: true, createdAt: true },
      },
      mandateDocuments: {
        orderBy: { createdAt: "desc" },
        select: { id: true, fileName: true, mimeType: true, fileSize: true, storageKey: true, createdAt: true },
      },
      generatedMandate: { select: { fileName: true, generatedAt: true, sentAt: true } },
      events: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          eventType: true,
          note: true,
          createdAt: true,
          actor: { select: { firstName: true, lastName: true } },
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 8,
      },
    },
  });

  if (!record) throw new DomainError("Solicitud no encontrada.", 404);

  const acceptedQuote = record.quotes.find((quote) => quote.status === "ACCEPTED") ?? null;
  const shippingStarted = record.events.find((event) => event.eventType === "SHIPPING_STARTED") ?? null;
  const shippingCompleted = record.events.find((event) => event.eventType === "REQUEST_COMPLETED") ?? null;
  const shippingAvailable = record.status === "PAID" || record.status === "SHIPPING" || record.status === "COMPLETED" || Boolean(acceptedQuote?.estimatedShippingDays);
  const hasPaid = record.payments.some((payment) => payment.status === "PAID");
  const currentQuoteRecord =
    record.quotes.find((quote) => quote.status === "SENT")
    ?? acceptedQuote
    ?? record.quotes[0]
    ?? null;
  const currentExpired = currentQuoteRecord ? quoteExpired(currentQuoteRecord.status, currentQuoteRecord.validUntil) : false;
  const canDecide = Boolean(currentQuoteRecord && record.status === "AWAITING_DECISION" && currentQuoteRecord.status === "SENT" && !currentExpired);
  const canContinueAfterAccept = Boolean(currentQuoteRecord && ["ACCEPTED", "PAID"].includes(record.status) && currentQuoteRecord.status === "ACCEPTED");

  const quotes = record.quotes.map((quote) => ({
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    version: quote.version,
    status: quoteExpired(quote.status, quote.validUntil) ? "EXPIRED" : quote.status,
    priceBreakdown: quotePriceBreakdownFromItems(quote.items),
    total: quotePriceBreakdownFromItems(quote.items).total.toString(),
    validUntil: iso(quote.validUntil),
    estimatedShippingDays: quote.estimatedShippingDays,
    sentAt: iso(quote.sentAt),
    acceptedAt: iso(quote.acceptedAt),
    createdAt: quote.createdAt.toISOString(),
    items: quote.items.map(serializeQuoteItem),
  }));

  const currentQuote = currentQuoteRecord
    ? {
        ...quotes.find((quote) => quote.id === currentQuoteRecord.id)!,
        canDecide,
        canContinueAfterAccept,
        canPay: canContinueAfterAccept && !hasPaid,
        canAdvanceWithoutPayment: canContinueAfterAccept && !hasPaid,
        payment: record.payments[0] ? serializePayment(record.payments[0]) : null,
      }
    : null;

  return {
    id: record.id,
    requestNumber: record.requestNumber,
    requesterName: record.requesterName,
    patientName: record.patientName,
    status: record.status,
    statusLabel: REQUEST_STATUS_LABELS[record.status] || record.status,
    statusDescription: REQUEST_STATUS_DESCRIPTIONS[record.status] || "",
    productType: record.productType,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    medications: record.medications,
    medicalDevices: record.medicalDevices,
    quotes,
    currentQuote,
    documents: serializePortalDocuments(record),
    history: record.events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      status: event.status,
      note: event.note,
      createdAt: event.createdAt.toISOString(),
      actorName: event.actor ? `${event.actor.firstName} ${event.actor.lastName}`.trim() : null,
    })),
    payments: record.payments.map(serializePayment),
    shipping: shippingAvailable
      ? {
          status: record.status,
          statusLabel: REQUEST_STATUS_LABELS[record.status] || record.status,
          estimatedShipping: formatEstimatedShippingDays(acceptedQuote?.estimatedShippingDays),
          startedAt: iso(shippingStarted?.createdAt),
          completedAt: iso(shippingCompleted?.createdAt),
          note: shippingStarted?.note ?? shippingCompleted?.note ?? REQUEST_STATUS_DESCRIPTIONS[record.status] ?? null,
        }
      : null,
  };
}

function serializePortalDocuments(record: {
  id: string;
  requestNumber: string | null;
  prescriptions: Array<{ id: string; fileName: string; mimeType: string; fileSize: number; storageKey: string | null; createdAt: Date }>;
  clientDocuments: Array<{ id: string; fileName: string; mimeType: string; fileSize: number; storageKey: string | null; documentKind: ClientDocumentKind | null; customLabel: string | null; createdAt: Date }>;
  mandateDocuments: Array<{ id: string; fileName: string; mimeType: string; fileSize: number; storageKey: string | null; createdAt: Date }>;
  generatedMandate: { fileName: string; generatedAt: Date; sentAt: Date | null } | null;
}) {
  const requestId = record.id;
  const requestNumber = record.requestNumber;
  const prescriptions = record.prescriptions.map((prescription) => {
    const meta = serializeDocumentMeta(prescription);
    return {
      id: prescription.id,
      category: "prescriptions" as const,
      label: "Receta médica",
      fileName: meta.fileName,
      mimeType: meta.mimeType,
      fileSize: meta.fileSize,
      createdAt: meta.createdAt,
      requestId,
      requestNumber,
      downloadable: meta.hasStoredFile,
    };
  });

  const generated = record.generatedMandate
    ? [{
        id: requestId,
        category: "generated-mandate" as const,
        label: record.generatedMandate.sentAt ? "Mandato enviado" : "Mandato generado",
        fileName: record.generatedMandate.fileName,
        mimeType: "application/pdf",
        fileSize: null as number | null,
        createdAt: (record.generatedMandate.sentAt ?? record.generatedMandate.generatedAt).toISOString(),
        requestId,
        requestNumber,
        downloadable: true,
      }]
    : [];

  const signedMandates = record.mandateDocuments.map((document) => {
    const meta = serializeDocumentMeta(document);
    return {
      id: document.id,
      category: "mandate-documents" as const,
      label: "Mandato firmado",
      fileName: meta.fileName,
      mimeType: meta.mimeType,
      fileSize: meta.fileSize,
      createdAt: meta.createdAt,
      requestId,
      requestNumber,
      downloadable: meta.hasStoredFile,
    };
  });

  const related = record.clientDocuments.map((document) => {
    const meta = serializeDocumentMeta(document);
    return {
      id: document.id,
      category: "client-documents" as const,
      label: resolveClientDocumentLabel(meta),
      fileName: meta.fileName,
      mimeType: meta.mimeType,
      fileSize: meta.fileSize,
      createdAt: meta.createdAt,
      requestId,
      requestNumber,
      downloadable: meta.hasStoredFile,
    };
  });

  return [...prescriptions, ...generated, ...signedMandates, ...related].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function listPortalQuotes(customerId: string, pageValue?: string | null) {
  const page = parsePage(pageValue);
  const where = visibleQuoteWhere(customerId);
  const [total, quotes] = await Promise.all([
    prisma.quote.count({ where }),
    prisma.quote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PORTAL_PAGE_SIZE,
      take: PORTAL_PAGE_SIZE,
      select: {
        id: true,
        quoteNumber: true,
        version: true,
        status: true,
        total: true,
        validUntil: true,
        estimatedShippingDays: true,
        sentAt: true,
        acceptedAt: true,
        createdAt: true,
        requestId: true,
        request: { select: { requestNumber: true, status: true } },
      },
    }),
  ]);

  return {
    quotes: quotes.map((quote) => {
      const expired = quoteExpired(quote.status, quote.validUntil);
      return {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        version: quote.version,
        status: expired ? "EXPIRED" : quote.status,
        total: serializeMoney(quote.total),
        validUntil: iso(quote.validUntil),
        estimatedShippingDays: quote.estimatedShippingDays,
        sentAt: iso(quote.sentAt),
        acceptedAt: iso(quote.acceptedAt),
        createdAt: quote.createdAt.toISOString(),
        requestId: quote.requestId,
        requestNumber: quote.request.requestNumber,
        requestStatus: quote.request.status,
        canDecide: quote.request.status === "AWAITING_DECISION" && quote.status === "SENT" && !expired,
        canPay: ["ACCEPTED", "PAID"].includes(quote.request.status) && quote.status === "ACCEPTED",
      };
    }),
    pagination: paginationMeta(total, page),
  };
}

export async function listPortalDocuments(customerId: string, pageValue?: string | null) {
  const page = parsePage(pageValue);
  const requests = await prisma.quoteRequest.findMany({
    where: scopedToCustomer(customerId),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      requestNumber: true,
      prescriptions: {
        orderBy: { createdAt: "desc" },
        select: { id: true, fileName: true, mimeType: true, fileSize: true, storageKey: true, createdAt: true },
      },
      clientDocuments: {
        orderBy: { createdAt: "desc" },
        select: { id: true, fileName: true, mimeType: true, fileSize: true, storageKey: true, documentKind: true, customLabel: true, createdAt: true },
      },
      mandateDocuments: {
        orderBy: { createdAt: "desc" },
        select: { id: true, fileName: true, mimeType: true, fileSize: true, storageKey: true, createdAt: true },
      },
      generatedMandate: { select: { fileName: true, generatedAt: true, sentAt: true } },
    },
  });

  const documents = requests.flatMap(serializePortalDocuments);
  const total = documents.length;
  const start = (page - 1) * PORTAL_PAGE_SIZE;

  return {
    documents: documents.slice(start, start + PORTAL_PAGE_SIZE),
    pagination: paginationMeta(total, page),
  };
}

export async function getPortalQuoteDetail(customerId: string, quoteId: string) {
  const quote = await prisma.quote.findFirst({
    where: {
      id: quoteId,
      ...visibleQuoteWhere(customerId),
    },
    select: {
      id: true,
      quoteNumber: true,
      version: true,
      status: true,
      total: true,
      validUntil: true,
      estimatedShippingDays: true,
      sentAt: true,
      acceptedAt: true,
      createdAt: true,
      requestId: true,
      items: { select: quoteItemSelect },
      request: {
        select: {
          id: true,
          requestNumber: true,
          status: true,
          requesterName: true,
          requesterEmail: true,
          customerId: true,
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 8,
      },
    },
  });

  if (!quote) throw new DomainError("Cotización no encontrada.", 404);

  const expired = quoteExpired(quote.status, quote.validUntil);
  const displayStatus = expired ? "EXPIRED" : quote.status;
  const latestPayment = quote.payments[0] ? serializePayment(quote.payments[0]) : null;
  const hasPaid = quote.payments.some((payment) => payment.status === "PAID");
  const canDecide = quote.request.status === "AWAITING_DECISION" && quote.status === "SENT" && !expired;
  const canContinueAfterAccept = ["ACCEPTED", "PAID"].includes(quote.request.status) && quote.status === "ACCEPTED";

  return {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    version: quote.version,
    status: displayStatus,
    priceBreakdown: quotePriceBreakdownFromItems(quote.items),
    total: quotePriceBreakdownFromItems(quote.items).total.toString(),
    validUntil: iso(quote.validUntil),
    estimatedShippingDays: quote.estimatedShippingDays,
    sentAt: iso(quote.sentAt),
    acceptedAt: iso(quote.acceptedAt),
    createdAt: quote.createdAt.toISOString(),
    requestId: quote.requestId,
    requestNumber: quote.request.requestNumber,
    requestStatus: quote.request.status,
    expired,
    canDecide,
    canContinueAfterAccept,
    canPay: canContinueAfterAccept && !hasPaid,
    canAdvanceWithoutPayment: canContinueAfterAccept && !hasPaid,
    items: quote.items.map(serializeQuoteItem),
    payment: latestPayment,
    payments: quote.payments.map(serializePayment),
  };
}

export async function getOwnedQuoteForAction(customerId: string, quoteId: string) {
  const quote = await prisma.quote.findFirst({
    where: ownedResourceWhere(customerId, quoteId),
    select: {
      id: true,
      quoteNumber: true,
      version: true,
      status: true,
      total: true,
      validUntil: true,
      request: {
        select: {
          id: true,
          requestNumber: true,
          status: true,
          requesterName: true,
          requesterEmail: true,
          customerId: true,
        },
      },
    },
  });

  if (!quote || quote.request.customerId !== customerId) {
    throw new DomainError("Cotización no encontrada.", 404);
  }

  return quote;
}

export async function updatePortalProfile(customer: PortalCustomer, input: PortalProfileUpdateInput) {
  const next = parsePortalProfileUpdate(input);
  if (!profileUpdateChanged(customer, next)) {
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      city: customer.city,
      promotionsConsent: customer.promotionsConsent,
      email: customer.email,
      rut: customer.rut,
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.customer.update({
      where: { id: customer.id },
      data: next,
      select: {
        id: true,
        name: true,
        phone: true,
        city: true,
        promotionsConsent: true,
        email: true,
        rut: true,
      },
    });

    await tx.quoteRequest.updateMany({
      where: { customerId: customer.id },
      data: {
        requesterName: next.name,
        requesterPhone: next.phone,
        requesterCity: next.city,
      },
    });

    return record;
  });

  return updated;
}
