import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readDevQuoteRequests, readDevQuotes, shouldUseJsonStorage, writeDevQuoteRequests } from "@/lib/dev-request-store";
import { getInternalActor } from "@/lib/internal-access";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!await getInternalActor()) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    if (shouldUseJsonStorage()) {
      const request = (await readDevQuoteRequests()).find((record) => record.id === id);

      if (!request) {
        return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
      }

      const quotes = (await readDevQuotes())
        .filter((quote) => quote.requestId === id)
        .sort((a, b) => b.version - a.version);

      return NextResponse.json({ ...request, clientDocuments: request.clientDocuments ?? [], generatedMandate: request.generatedMandate ?? null, internalNotes: request.internalNotes ?? [], events: request.events ?? [], quotes });
    }

    const request = await prisma.quoteRequest.findUnique({
      where: { id },
      include: {
        customer: true,
        prescriptions: true,
        clientDocuments: { orderBy: { createdAt: "desc" } },
        generatedMandate: true,
        medications: true,
        internalNotes: { orderBy: { createdAt: "desc" } },
        events: { orderBy: { createdAt: "desc" } },
        quotes: { orderBy: { version: "desc" }, include: { items: true } },
        assignedExecutive: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    return NextResponse.json({
      ...request,
      prescription: request.prescriptions[0] ?? null,
      internalNotes: request.internalNotes,
      quotes: request.quotes.map((quote) => ({
        ...quote,
        total: quote.total?.toString() ?? null,
        validUntil: quote.validUntil?.toISOString() ?? null,
        createdAt: quote.createdAt.toISOString(),
        items: quote.items.map((item) => ({
          ...item,
          expirationDate: item.expirationDate?.toISOString() ?? null,
          unitPrice: item.unitPrice?.toString() ?? null,
          totalPrice: item.totalPrice?.toString() ?? null,
        })),
      })),
    });
  } catch (error) {
    console.error("Error fetching request detail:", error);
    return NextResponse.json({ error: "Error al obtener la solicitud" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!await getInternalActor()) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    const body = (await request.json()) as { message?: unknown };
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) return NextResponse.json({ error: "La nota no puede estar vacía" }, { status: 400 });

    if (shouldUseJsonStorage()) {
      const records = await readDevQuoteRequests();
      const recordIndex = records.findIndex((record) => record.id === id);
      if (recordIndex === -1) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
      const note = { id: `note-${Date.now()}`, executiveName: "Administrador", message, createdAt: new Date().toISOString() };
      const record = records[recordIndex];
      records[recordIndex] = { ...record, internalNotes: [note, ...(record.internalNotes ?? [])] };
      await writeDevQuoteRequests(records);
      return NextResponse.json(note, { status: 201 });
    }

    const quoteRequest = await prisma.quoteRequest.findUnique({ where: { id }, select: { id: true } });
    if (!quoteRequest) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    const note = await prisma.quoteRequestNote.create({ data: { requestId: id, executiveName: "Administrador", message } });
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("Error creating request note:", error);
    return NextResponse.json({ error: "Error al guardar la nota" }, { status: 500 });
  }
}

type UpdatePayload = {
  customer?: { name?: unknown; email?: unknown; phone?: unknown; rut?: unknown; city?: unknown };
  patient?: { name?: unknown; rut?: unknown };
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!await getInternalActor()) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const payload = (await request.json()) as UpdatePayload;
  const customer = payload.customer;
  const patient = payload.patient;
  if ((!customer && !patient) || (customer && patient)) return NextResponse.json({ error: "Indica los datos que deseas actualizar." }, { status: 400 });

  const customerValues = customer ? { name: typeof customer.name === "string" ? customer.name.trim() : "", email: typeof customer.email === "string" ? customer.email.trim().toLowerCase() : "", phone: typeof customer.phone === "string" ? customer.phone.trim() : "", rut: typeof customer.rut === "string" ? customer.rut.trim().toUpperCase() : "", city: typeof customer.city === "string" ? customer.city.trim() : "" } : null;
  const patientValues = patient ? { name: typeof patient.name === "string" ? patient.name.trim() : "", rut: typeof patient.rut === "string" ? patient.rut.trim().toUpperCase() : "" } : null;
  if (Object.values(customerValues ?? patientValues ?? {}).some((value) => !value)) return NextResponse.json({ error: "Completa todos los campos obligatorios." }, { status: 400 });
  if (customerValues && !/^\S+@\S+\.\S+$/.test(customerValues.email)) return NextResponse.json({ error: "Revisa el formato del correo." }, { status: 400 });

  try {
    if (shouldUseJsonStorage()) {
      const records = await readDevQuoteRequests();
      const index = records.findIndex((record) => record.id === id);
      if (index === -1) return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
      const current = records[index];
      const updatedAt = new Date().toISOString();
      records[index] = customerValues
        ? { ...current, requesterName: customerValues.name, requesterEmail: customerValues.email, requesterPhone: customerValues.phone, requesterRut: customerValues.rut, requesterCity: customerValues.city, customer: current.customer ? { ...current.customer, ...customerValues } : current.customer, updatedAt }
        : { ...current, patientName: patientValues!.name, patientRut: patientValues!.rut, updatedAt };
      await writeDevQuoteRequests(records);
      return NextResponse.json({ customer: records[index].customer ?? (customerValues ? { id: records[index].customerId, ...customerValues } : null), patient: { name: records[index].patientName, rut: records[index].patientRut }, updatedAt });
    }

    const current = await prisma.quoteRequest.findUnique({ where: { id }, select: { customerId: true } });
    if (!current) return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
    const updated = await prisma.$transaction(async (transaction) => {
      if (customerValues) {
        if (current.customerId) await transaction.customer.update({ where: { id: current.customerId }, data: customerValues });
        return transaction.quoteRequest.update({ where: { id }, data: { requesterName: customerValues.name, requesterEmail: customerValues.email, requesterPhone: customerValues.phone, requesterRut: customerValues.rut, requesterCity: customerValues.city }, select: { updatedAt: true, customer: { select: { id: true, name: true, email: true, phone: true, rut: true, city: true } }, patientName: true, patientRut: true } });
      }
      return transaction.quoteRequest.update({ where: { id }, data: { patientName: patientValues!.name, patientRut: patientValues!.rut }, select: { updatedAt: true, customer: { select: { id: true, name: true, email: true, phone: true, rut: true, city: true } }, patientName: true, patientRut: true } });
    });
    return NextResponse.json({ customer: updated.customer, patient: { name: updated.patientName, rut: updated.patientRut }, updatedAt: updated.updatedAt.toISOString() });
  } catch (error) {
    console.error("Error updating request parties:", error);
    return NextResponse.json({ error: "No fue posible actualizar la información." }, { status: 500 });
  }
}