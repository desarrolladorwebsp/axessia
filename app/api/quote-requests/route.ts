import { NextResponse, NextRequest } from "next/server";
import { Prisma, QuoteRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createDevRequestNotification, shouldUseJsonStorage, readDevQuoteRequests, writeDevQuoteRequests } from "@/lib/dev-request-store";
import { sendQuoteRequestReceivedEmail, sendInternalQuoteRequestNotification } from "@/lib/services/email";
import { normalizeSearchValue } from "@/lib/search";
import { getInternalActor } from "@/lib/internal-access";

type QuoteRequestPayload = {
  customerId?: string;
  customer: {
    name: string;
    phone: string;
    email: string;
    rut: string;
    city: string;
  };
  patient?: {
    name?: string;
    rut?: string;
  };
  prescription: {
    fileName: string;
    mimeType: string;
    fileSize: number;
  };
  medications: Array<{
    commercialName: string;
    activeIngredient: string;
    concentration: string;
    tabletQuantity: number;
  }>;
  acceptsPolicies: boolean;
  acceptsDataTreatment: boolean;
};

export async function GET(request: NextRequest) {
  if (!await getInternalActor()) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const status = Object.values(QuoteRequestStatus).includes(statusParam as QuoteRequestStatus)
      ? statusParam as QuoteRequestStatus
      : undefined;
    const executive = searchParams.get("executive");
    const rawQuery = searchParams.get("q") ?? "";
    const query = normalizeSearchValue(rawQuery);
    const requestedPage = Number.parseInt(searchParams.get("page") || "1", 10);
    const requestedLimit = Number.parseInt(searchParams.get("limit") || "10", 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 10;

    if (shouldUseJsonStorage()) {
      const records = await readDevQuoteRequests();
      const filtered = status
        ? records.filter((record) => record.status === status)
        : records;

      const sorted = [...filtered].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const total = sorted.length;
      const paginated = sorted.slice((page - 1) * limit, page * limit);

      const statusCounts = sorted.reduce<Record<string, number>>((accumulator, record) => {
        accumulator[record.status] = (accumulator[record.status] ?? 0) + 1;
        return accumulator;
      }, {});

      const summary = {
        totalRequests: total,
        received: statusCounts.RECEIVED ?? 0,
        inManagement: (statusCounts.RECEIVED ?? 0) + (statusCounts.SOURCING ?? 0),
        quoted: statusCounts.QUOTED ?? 0,
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
      ...(status ? { status } : {}),
      ...(executive === "unassigned" ? { assignedExecutiveId: null } : {}),
      ...(query
        ? {
            OR: [
              { requestNumber: { contains: query } },
              { requesterName: { contains: query } },
              { requesterEmail: { contains: query } },
              { customer: { is: { OR: [{ name: { contains: query } }, { email: { contains: query } }] } } },
              { medications: { some: { OR: [{ commercialName: { contains: query } }, { activeIngredient: { contains: query } }] } } },
            ],
          }
        : {}),
    };
    const skip = (page - 1) * limit;

    const [quotes, total, statusSummary] = await Promise.all([
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
      quoted: statusCounts.QUOTED ?? 0,
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
  const payload = (await request.json()) as QuoteRequestPayload;
  const selectedCustomerId = typeof payload.customerId === "string" ? payload.customerId.trim() : "";
  if (selectedCustomerId && !await getInternalActor()) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  if (!payload.acceptsPolicies || !payload.acceptsDataTreatment) {
    return NextResponse.json({ error: "Los consentimientos son obligatorios." }, { status: 400 });
  }

  if (!payload.customer || !payload.prescription || !payload.medications?.length) {
    return NextResponse.json({ error: "La solicitud está incompleta." }, { status: 400 });
  }

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
      price: null,
      acceptsPolicies: payload.acceptsPolicies,
      acceptsDataTreatment: payload.acceptsDataTreatment,
      createdAt: now,
      updatedAt: now,
      customer: null,
      prescription: {
        id: `dev-prescription-${Date.now()}`,
        requestId,
        fileName: payload.prescription.fileName,
        mimeType: payload.prescription.mimeType,
        fileSize: payload.prescription.fileSize,
        storageKey: null,
        createdAt: now,
      },
      medications: payload.medications.map((medication, index) => ({
        id: `dev-med-${Date.now()}-${index}`,
        requestId,
        commercialName: medication.commercialName,
        activeIngredient: medication.activeIngredient,
        concentration: medication.concentration,
        tabletQuantity: medication.tabletQuantity,
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
      payload.medications.length,
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
        acceptsPolicies: payload.acceptsPolicies,
        acceptsDataTreatment: payload.acceptsDataTreatment,
        prescriptions: { create: payload.prescription },
        medications: { create: payload.medications },
      },
      select: { sequence: true, id: true, status: true, createdAt: true },
    });

    const request = await transaction.quoteRequest.update({
      where: { sequence: createdRequest.sequence },
      data: { requestNumber: `S-${100000 + createdRequest.sequence}` },
      select: { id: true, requestNumber: true, customerId: true, status: true, createdAt: true, customer: { select: { name: true, email: true } } },
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
    payload.medications.length,
  );

  return NextResponse.json(quoteRequest, { status: 201 });
}