import { NextResponse, NextRequest } from "next/server";
import { Prisma, QuoteRequestStatus, QuoteRequestOrigin } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildSystemDocumentFileName } from "@/lib/documents/file-name";
import { savePrescriptionForRequest, validatePrescriptionUpload, type ValidatedPrescriptionUpload } from "@/lib/documents/prescription";
import { createDevRequestNotification, readDevQuotes, shouldUseJsonStorage, readDevQuoteRequests, writeDevQuoteRequests } from "@/lib/dev-request-store";
import { sendQuoteRequestReceivedEmail, sendInternalQuoteRequestNotification } from "@/lib/services/email";
import { normalizeSearchValue } from "@/lib/search";
import { getInternalActor } from "@/lib/internal-access";
import { CUSTOMER_SESSION_COOKIE, verifyCustomerSessionToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { resolveQuoteRequestOrigin } from "@/lib/request-origin";
import { isMedicalDevice, isProductType, parseMedicalDeviceItems, parseMedicationItems, type ProductType } from "@/lib/product-type";
import { parseQuoteRequestBody } from "@/lib/quote-request-post";
import type { QuoteRequestFormPayload } from "@/lib/quote-request-form-data";

type QuoteRequestPayload = QuoteRequestFormPayload & {
  prescription?: {
    fileName: string;
    mimeType: string;
    fileSize: number;
  } | null;
};

export async function GET(request: NextRequest) {
  if (!await getInternalActor()) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const status = Object.values(QuoteRequestStatus).includes(statusParam as QuoteRequestStatus)
      ? statusParam as QuoteRequestStatus
      : undefined;
    const originParam = searchParams.get("origin");
    const origin = Object.values(QuoteRequestOrigin).includes(originParam as QuoteRequestOrigin)
      ? originParam as QuoteRequestOrigin
      : undefined;
    const executive = searchParams.get("executive");
    const rawQuery = searchParams.get("q") ?? "";
    const query = normalizeSearchValue(rawQuery);
    const requestedPage = Number.parseInt(searchParams.get("page") || "1", 10);
    const requestedLimit = Number.parseInt(searchParams.get("limit") || "10", 10);
    const hasPeriod = searchParams.has("month") || searchParams.has("year");
    const requestedMonth = Number.parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);
    const requestedYear = Number.parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 10;
    const month = Number.isFinite(requestedMonth) ? Math.min(Math.max(requestedMonth, 1), 12) : new Date().getMonth() + 1;
    const year = Number.isFinite(requestedYear) && requestedYear > 0 ? requestedYear : new Date().getFullYear();
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

    if (shouldUseJsonStorage()) {
      const records = await readDevQuoteRequests();
      const recordsInPeriod = hasPeriod ? records.filter((record) => {
        const createdAt = new Date(record.createdAt);
        return createdAt >= monthStart && createdAt < monthEnd;
      }) : records;
      const filtered = status
        ? recordsInPeriod.filter((record) => record.status === status)
        : recordsInPeriod;
      const filteredByOrigin = origin ? filtered.filter((record) => record.origin === origin) : filtered;

      const sorted = [...filteredByOrigin].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const total = sorted.length;
      const paginated = sorted.slice((page - 1) * limit, page * limit);
      const storedQuotes = await readDevQuotes();
      const issuedQuotes = storedQuotes.filter((quote) => ["SENT", "ACCEPTED"].includes(quote.status));
      const quoteCount = hasPeriod ? issuedQuotes.filter((quote) => {
        const createdAt = new Date(quote.createdAt);
        return createdAt >= monthStart && createdAt < monthEnd;
      }).length : issuedQuotes.length;

      const statusCounts = sorted.reduce<Record<string, number>>((accumulator, record) => {
        accumulator[record.status] = (accumulator[record.status] ?? 0) + 1;
        return accumulator;
      }, {});

      const summary = {
        totalRequests: total,
        received: statusCounts.RECEIVED ?? 0,
        inManagement: (statusCounts.RECEIVED ?? 0) + (statusCounts.SOURCING ?? 0),
        quoted: quoteCount,
        pendingDecision: statusCounts.AWAITING_DECISION ?? 0,
        accepted: statusCounts.ACCEPTED ?? 0,
        shipping: statusCounts.SHIPPING ?? 0,
        rejected: statusCounts.REJECTED ?? 0,
        cancelled: statusCounts.CANCELLED ?? 0,
        completed: statusCounts.COMPLETED ?? 0,
        dueSoon: sorted.filter((record) => {
          const activeStatuses = ["RECEIVED", "SOURCING", "QUOTED", "AWAITING_DECISION"];
          if (!activeStatuses.includes(record.status)) return false;
          const days = (Date.now() - new Date(record.createdAt).getTime()) / 86400000;
          return days > 7;
        }).length,
        averageAgeDays: sorted.length
          ? Number(
              (
                sorted.reduce((sum, record) => sum + (Date.now() - new Date(record.createdAt).getTime()) / 86400000, 0) /
                sorted.length
              ).toFixed(1)
            )
          : 0,
      };

      return NextResponse.json({
        quotes: paginated,
        summary,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    }

    const where: Prisma.QuoteRequestWhereInput = {
      ...(hasPeriod ? { createdAt: { gte: monthStart, lt: monthEnd } } : {}),
      ...(status ? { status } : {}),
      ...(origin ? { origin } : {}),
      ...(executive === "unassigned" ? { assignedExecutiveId: null } : {}),
      ...(query
        ? {
            OR: [
              { requestNumber: { contains: query } },
              { requesterName: { contains: query } },
              { requesterEmail: { contains: query } },
              { customer: { is: { OR: [{ name: { contains: query } }, { email: { contains: query } }] } } },
              { medications: { some: { OR: [{ commercialName: { contains: query } }, { activeIngredient: { contains: query } }] } } },
              { medicalDevices: { some: { OR: [{ name: { contains: query } }, { brand: { contains: query } }, { model: { contains: query } }] } } },
            ],
          }
        : {}),
    };
    const skip = (page - 1) * limit;

    const [quotes, total, statusSummary, quoteCount] = await Promise.all([
      prisma.quoteRequest.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          assignedExecutive: {
            select: { id: true, firstName: true, lastName: true },
          },
          medications: true,
          medicalDevices: true,
          prescriptions: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.quoteRequest.count({ where }),
      prisma.quoteRequest.groupBy({
        by: ["status"],
        _count: { status: true },
        where,
      }),
      prisma.quote.count({
        where: {
          status: { in: ["SENT", "ACCEPTED"] },
          ...(hasPeriod ? { createdAt: { gte: monthStart, lt: monthEnd } } : {}),
        },
      }),
    ]);

    const statusCounts = Object.fromEntries(statusSummary.map((item) => [item.status, item._count.status]));
    const records = await prisma.quoteRequest.findMany({
      where,
      select: { status: true, createdAt: true },
    });
    const allAges = records.map((record) => (Date.now() - new Date(record.createdAt).getTime()) / 86400000);
    const summary = {
      totalRequests: total,
      received: statusCounts.RECEIVED ?? 0,
      inManagement: (statusCounts.RECEIVED ?? 0) + (statusCounts.SOURCING ?? 0),
      quoted: quoteCount,
      pendingDecision: statusCounts.AWAITING_DECISION ?? 0,
      accepted: statusCounts.ACCEPTED ?? 0,
      shipping: statusCounts.SHIPPING ?? 0,
      rejected: statusCounts.REJECTED ?? 0,
      cancelled: statusCounts.CANCELLED ?? 0,
      completed: statusCounts.COMPLETED ?? 0,
      dueSoon: records.filter((record) => {
        const activeStatuses = ["RECEIVED", "SOURCING", "QUOTED", "AWAITING_DECISION"];
        if (!activeStatuses.includes(record.status)) return false;
        const days = (Date.now() - new Date(record.createdAt).getTime()) / 86400000;
        return days > 7;
      }).length,
      averageAgeDays: allAges.length
        ? Number((allAges.reduce((sum, days) => sum + days, 0) / allAges.length).toFixed(1))
        : 0,
    };

    return NextResponse.json({
      quotes: quotes.map((quote) => ({
        ...quote,
        prescription: quote.prescriptions[0] ?? null,
      })),
      summary,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return NextResponse.json(
      { error: "Error al obtener cotizaciones" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let payload: QuoteRequestPayload;
  let prescriptionFile: File | null = null;

  try {
    const parsed = await parseQuoteRequestBody(request);
    payload = parsed.payload;
    prescriptionFile = parsed.prescriptionFile;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "La solicitud está incompleta." },
      { status: 400 },
    );
  }

  const selectedCustomerId = typeof payload.customerId === "string" ? payload.customerId.trim() : "";
  const cookieStore = await cookies();
  const hasCustomerSession = Boolean(verifyCustomerSessionToken(cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value));
  // If the request comes from the customer portal, it must remain WEB even
  // when the same browser also has an old internal-session cookie.
  const internalActor = hasCustomerSession ? null : await getInternalActor();
  if (selectedCustomerId && !internalActor) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  // El origen se determina en el servidor según quién ejecuta la creación; el cliente nunca lo envía ni lo controla.
  const origin = resolveQuoteRequestOrigin({ hasCustomerSession, hasInternalActor: Boolean(internalActor) });

  if (!payload.acceptsPolicies || !payload.acceptsDataTreatment) {
    return NextResponse.json({ error: "Los consentimientos son obligatorios." }, { status: 400 });
  }

  const productType: ProductType = isProductType(payload.productType) ? payload.productType : "MEDICATION";
  const deviceRequest = isMedicalDevice(productType);

  let validatedPrescription: ValidatedPrescriptionUpload | null = null;
  if (prescriptionFile) {
    const validation = await validatePrescriptionUpload(prescriptionFile);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    validatedPrescription = validation.value;
  }

  if (!payload.customer || (!deviceRequest && !validatedPrescription)) {
    return NextResponse.json({ error: deviceRequest ? "La solicitud está incompleta." : "Adjunta la receta médica." }, { status: 400 });
  }

  let medications: ReturnType<typeof parseMedicationItems> = [];
  let medicalDevices: ReturnType<typeof parseMedicalDeviceItems> = [];
  try {
    if (deviceRequest) medicalDevices = parseMedicalDeviceItems(payload.medicalDevices);
    else medications = parseMedicationItems(payload.medications);
  } catch (validationError) {
    return NextResponse.json({ error: validationError instanceof Error ? validationError.message : "La solicitud está incompleta." }, { status: 400 });
  }

  try {
    if (shouldUseJsonStorage()) {
    const records = await readDevQuoteRequests();
    const now = new Date().toISOString();
    const nextSequence = records.length + 1;
    const requestNumber = `S-${100000 + nextSequence}`;
    const requestId = `dev-${Date.now()}`;

    const record = {
      id: requestId,
      sequence: nextSequence,
      requestNumber,
      customerId: null,
      requesterName: payload.customer.name,
      requesterPhone: payload.customer.phone,
      requesterEmail: payload.customer.email,
      requesterRut: payload.customer.rut,
      requesterCity: payload.customer.city,
      patientName: payload.patient?.name || null,
      patientRut: payload.patient?.rut || null,
      status: "RECEIVED" as const,
      origin,
      productType,
      price: null,
      acceptsPolicies: payload.acceptsPolicies,
      acceptsDataTreatment: payload.acceptsDataTreatment,
      createdAt: now,
      updatedAt: now,
      customer: null,
      prescription: validatedPrescription
        ? {
            id: `dev-prescription-${Date.now()}`,
            requestId,
            fileName: buildSystemDocumentFileName({
              type: "prescription",
              requestNumber,
              extension: validatedPrescription.extension,
            }),
            mimeType: validatedPrescription.mimeType,
            fileSize: validatedPrescription.buffer.length,
            storageKey: null,
            createdAt: now,
          }
        : null,
      medications: medications.map((medication, index) => ({
        id: `dev-med-${Date.now()}-${index}`,
        requestId,
        commercialName: medication.commercialName,
        activeIngredient: medication.activeIngredient,
        concentration: medication.concentration,
        tabletQuantity: medication.tabletQuantity,
        notes: medication.notes,
        createdAt: now,
      })),
      medicalDevices: medicalDevices.map((device, index) => ({
        id: `dev-device-${Date.now()}-${index}`,
        requestId,
        name: device.name,
        brand: device.brand,
        model: device.model,
        quantity: device.quantity,
        description: device.description,
        createdAt: now,
      })),
      events: [{
        id: `dev-event-${Date.now()}`,
        status: "RECEIVED",
        eventType: "REQUEST_RECEIVED",
        createdAt: now,
      }],
    };

    const nextRecords = [record, ...records];
    await writeDevQuoteRequests(nextRecords);
    await createDevRequestNotification(record);

    // Send emails asynchronously (fire-and-forget)
    sendQuoteRequestReceivedEmail(
      payload.customer.email,
      payload.customer.name,
      requestNumber,
    );
    sendInternalQuoteRequestNotification(
      payload.customer.name,
      payload.customer.email,
      requestNumber,
      deviceRequest ? medicalDevices.length : medications.length,
      productType,
    );

    return NextResponse.json({
      id: record.id,
      requestNumber: record.requestNumber,
      customerId: record.customerId,
      status: record.status,
      createdAt: record.createdAt,
      price: record.price,
    }, { status: 201 });
  }

  const quoteRequest = await prisma.$transaction(async (transaction) => {
    const selectedCustomer = selectedCustomerId
      ? await transaction.customer.findUnique({ where: { id: selectedCustomerId }, select: { id: true, name: true, phone: true, email: true, rut: true, city: true } })
      : null;
    if (selectedCustomerId && !selectedCustomer) throw new Error("Cliente no encontrado");
    const existingCustomer = selectedCustomer ?? await transaction.customer.findFirst({
      where: { OR: [{ email: payload.customer.email.toLowerCase() }, { rut: payload.customer.rut.toUpperCase() }] },
      select: { id: true, name: true, phone: true, email: true, rut: true, city: true },
    });
    const customer = existingCustomer ?? await transaction.customer.create({
      data: {
        name: payload.customer.name.trim(),
        phone: payload.customer.phone.trim(),
        email: payload.customer.email.toLowerCase().trim(),
        rut: payload.customer.rut.toUpperCase().trim(),
        city: payload.customer.city.trim(),
      },
      select: { id: true, name: true, phone: true, email: true, rut: true, city: true },
    });
    const createdRequest = await transaction.quoteRequest.create({
      data: {
        customerId: customer.id,
        requesterName: customer.name,
        requesterPhone: customer.phone,
        requesterEmail: customer.email,
        requesterRut: customer.rut,
        requesterCity: customer.city,
        patientName: payload.patient?.name || null,
        patientRut: payload.patient?.rut || null,
        origin,
        productType,
        acceptsPolicies: payload.acceptsPolicies,
        acceptsDataTreatment: payload.acceptsDataTreatment,
        medications: medications.length ? { create: medications } : undefined,
        medicalDevices: medicalDevices.length ? { create: medicalDevices } : undefined,
      },
      select: { sequence: true, id: true, status: true, createdAt: true, customerId: true },
    });

    const request = await transaction.quoteRequest.update({
      where: { sequence: createdRequest.sequence },
      data: { requestNumber: `S-${100000 + createdRequest.sequence}` },
      select: { id: true, requestNumber: true, customerId: true, status: true, origin: true, createdAt: true, customer: { select: { name: true, email: true } } },
    });

    await transaction.quoteRequestEvent.create({
      data: {
        requestId: request.id,
        status: request.status,
        eventType: "REQUEST_RECEIVED",
      },
    });

    await transaction.notification.create({
      data: { requestId: request.id },
    });

    return request;
  });

  if (validatedPrescription) {
    try {
      await savePrescriptionForRequest({
        requestId: quoteRequest.id,
        customerId: quoteRequest.customerId,
        fileName: validatedPrescription.fileName,
        buffer: validatedPrescription.buffer,
        mimeType: validatedPrescription.mimeType,
        extension: validatedPrescription.extension,
      });
    } catch (uploadError) {
      const storageRoot = process.env.AXESSIA_STORAGE_ROOT?.trim() || (process.env.NODE_ENV === "production" ? "/home/axessia/storage/axessia" : "storage/axessia (relativo al cwd)");
      console.error("Error storing prescription for quote request:", uploadError, { storageRoot });
      await prisma.quoteRequest.delete({ where: { id: quoteRequest.id } }).catch(() => undefined);
      return NextResponse.json(
        { error: "No fue posible guardar la receta adjunta. Intenta nuevamente." },
        { status: 500 },
      );
    }
  }

  // Send emails asynchronously (fire-and-forget)
  // These run after the database transaction succeeds, ensuring the request ID exists
  const recipient = quoteRequest.customer ?? { name: payload.customer.name, email: payload.customer.email };
  sendQuoteRequestReceivedEmail(
    recipient.email,
    recipient.name,
    quoteRequest.requestNumber ?? "Sin número",
  );
  sendInternalQuoteRequestNotification(
    recipient.name,
    recipient.email,
    quoteRequest.requestNumber ?? "Sin número",
    deviceRequest ? medicalDevices.length : medications.length,
    productType,
  );

  return NextResponse.json(quoteRequest, { status: 201 });
  } catch (error) {
    console.error("Error creating quote request:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2011") {
      return NextResponse.json(
        { error: "No fue posible guardar la solicitud. Un campo opcional todavía es obligatorio en la base de datos." },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === "Cliente no encontrado") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "No fue posible guardar la solicitud. Intenta nuevamente." }, { status: 500 });
  }
}
