import { NextResponse, NextRequest } from "next/server";
import { Prisma, type QuoteRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { shouldUseJsonStorage, readDevQuoteRequests, writeDevQuoteRequests } from "@/lib/dev-request-store";
import { sendQuoteRequestReceivedEmail, sendInternalQuoteRequestNotification } from "@/lib/services/email";

type QuoteRequestPayload = {
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
  try {
    if (shouldUseJsonStorage()) {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get("status");
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "10");

      const records = await readDevQuoteRequests();
      const filtered = status
        ? records.filter((record) => record.status === status)
        : records;

      const sorted = [...filtered].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const total = sorted.length;
      const paginated = sorted.slice((page - 1) * limit, page * limit);

      return NextResponse.json({
        quotes: paginated,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const where: Prisma.QuoteRequestWhereInput = status
      ? { status: status as QuoteRequestStatus }
      : {};
    const skip = (page - 1) * limit;

    const [quotes, total] = await Promise.all([
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
          medications: true,
          prescriptions: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.quoteRequest.count({ where }),
    ]);

    return NextResponse.json({
      quotes: quotes.map((quote) => ({
        ...quote,
        prescription: quote.prescriptions[0] ?? null,
      })),
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
    };

    const nextRecords = [record, ...records];
    await writeDevQuoteRequests(nextRecords);

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
    const existingCustomer = await transaction.customer.findFirst({
      where: { OR: [{ email: payload.customer.email.toLowerCase() }, { rut: payload.customer.rut.toUpperCase() }] },
      select: { id: true },
    });
    const customer = existingCustomer ?? await transaction.customer.create({
      data: {
        name: payload.customer.name.trim(),
        phone: payload.customer.phone.trim(),
        email: payload.customer.email.toLowerCase().trim(),
        rut: payload.customer.rut.toUpperCase().trim(),
        city: payload.customer.city.trim(),
      },
      select: { id: true },
    });
    const createdRequest = await transaction.quoteRequest.create({
      data: {
        customerId: customer.id,
        requesterName: payload.customer.name,
        requesterPhone: payload.customer.phone,
        requesterEmail: payload.customer.email,
        requesterRut: payload.customer.rut,
        requesterCity: payload.customer.city,
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
      select: { id: true, requestNumber: true, customerId: true, status: true, createdAt: true },
    });

    await transaction.quoteRequestEvent.create({
      data: {
        requestId: request.id,
        status: request.status,
        eventType: "REQUEST_RECEIVED",
      },
    });

    return request;
  });

  // Send emails asynchronously (fire-and-forget)
  // These run after the database transaction succeeds, ensuring the request ID exists
  sendQuoteRequestReceivedEmail(
    payload.customer.email,
    payload.customer.name,
    quoteRequest.requestNumber ?? "Sin número",
  );
  sendInternalQuoteRequestNotification(
    payload.customer.name,
    payload.customer.email,
    quoteRequest.requestNumber ?? "Sin número",
    payload.medications.length,
  );

  return NextResponse.json(quoteRequest, { status: 201 });
}