import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readDevQuoteRequests, readDevQuotes, shouldUseJsonStorage, writeDevQuoteRequests } from "@/lib/dev-request-store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  try {
    if (shouldUseJsonStorage()) {
      const request = (await readDevQuoteRequests()).find((record) => record.id === id);

      if (!request) {
        return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
      }

      const quotes = (await readDevQuotes())
        .filter((quote) => quote.requestId === id)
        .sort((a, b) => b.version - a.version);

      return NextResponse.json({ ...request, internalNotes: request.internalNotes ?? [], quotes });
    }

    const request = await prisma.quoteRequest.findUnique({
      where: { id },
      include: {
        customer: true,
        prescriptions: true,
        medications: true,
        internalNotes: { orderBy: { createdAt: "desc" } },
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