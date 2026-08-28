import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readDevQuoteRequests, writeDevQuoteRequests, shouldUseJsonStorage } from "@/lib/dev-request-store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type StatusPayload = { action?: unknown; executiveId?: unknown; reason?: unknown };

function invalid(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Roles allowed to be assigned as the executive responsible for a request.
const manageableRoles = ["EJECUTIVO", "ADMINISTRADOR"];
const rejectableStatuses = ["RECEIVED", "REVIEWING", "SOURCING", "QUOTED", "AWAITING_DECISION"];

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  try {
    const payload = (await request.json()) as StatusPayload;
    const action = payload.action;
    if (action !== "CONFIRM_MANAGEMENT" && action !== "REJECT") return invalid("Acción no válida");

    if (action === "CONFIRM_MANAGEMENT") {
      const executiveId = typeof payload.executiveId === "string" ? payload.executiveId.trim() : "";
      if (!executiveId) return invalid("Selecciona un ejecutivo responsable");

      const executive = await prisma.user.findUnique({ where: { id: executiveId }, select: { id: true, firstName: true, lastName: true, role: true } });
      if (!executive || !manageableRoles.includes(executive.role)) return invalid("El ejecutivo seleccionado no es válido");

      if (shouldUseJsonStorage()) {
        const records = await readDevQuoteRequests();
        const index = records.findIndex((record) => record.id === id);
        if (index === -1) return invalid("Solicitud no encontrada", 404);
        if (records[index].status !== "RECEIVED") return invalid("La solicitud ya no está disponible para esta acción", 409);

        const now = new Date().toISOString();
        records[index] = {
          ...records[index],
          status: "SOURCING",
          updatedAt: now,
          assignedExecutive: { id: executive.id, firstName: executive.firstName, lastName: executive.lastName },
        };
        await writeDevQuoteRequests(records);
        return NextResponse.json({ status: records[index].status, assignedExecutive: records[index].assignedExecutive, updatedAt: now });
      }

      const existing = await prisma.quoteRequest.findUnique({ where: { id }, select: { status: true } });
      if (!existing) return invalid("Solicitud no encontrada", 404);
      if (existing.status !== "RECEIVED") return invalid("La solicitud ya no está disponible para esta acción", 409);

      const updated = await prisma.$transaction(async (transaction) => {
        const updatedRequest = await transaction.quoteRequest.update({
          where: { id },
          data: { status: "SOURCING", assignedExecutiveId: executive.id },
          select: { status: true, updatedAt: true, assignedExecutive: { select: { id: true, firstName: true, lastName: true } } },
        });
        await transaction.quoteRequestEvent.create({
          data: { requestId: id, status: "SOURCING", eventType: "MANAGEMENT_CONFIRMED", actorId: executive.id },
        });
        return updatedRequest;
      });

      return NextResponse.json({ status: updated.status, assignedExecutive: updated.assignedExecutive, updatedAt: updated.updatedAt.toISOString() });
    }

    // action === "REJECT"
    const reason = typeof payload.reason === "string" ? payload.reason.trim() : "";
    if (!reason) return invalid("El motivo de rechazo es obligatorio");

    if (shouldUseJsonStorage()) {
      const records = await readDevQuoteRequests();
      const index = records.findIndex((record) => record.id === id);
      if (index === -1) return invalid("Solicitud no encontrada", 404);
      if (!rejectableStatuses.includes(records[index].status)) return invalid("La solicitud ya no está disponible para esta acción", 409);

      const now = new Date().toISOString();
      const note = { id: `note-${Date.now()}`, executiveName: "Administrador", message: `Solicitud rechazada. Motivo: ${reason}`, createdAt: now };
      records[index] = { ...records[index], status: "REJECTED", updatedAt: now, internalNotes: [note, ...(records[index].internalNotes ?? [])] };
      await writeDevQuoteRequests(records);
      return NextResponse.json({ status: "REJECTED", updatedAt: now, note });
    }

    const existing = await prisma.quoteRequest.findUnique({ where: { id }, select: { status: true } });
    if (!existing) return invalid("Solicitud no encontrada", 404);
    if (!rejectableStatuses.includes(existing.status)) return invalid("La solicitud ya no está disponible para esta acción", 409);

    const [updated, note] = await prisma.$transaction([
      prisma.quoteRequest.update({ where: { id }, data: { status: "REJECTED" }, select: { status: true, updatedAt: true } }),
      prisma.quoteRequestNote.create({ data: { requestId: id, executiveName: "Administrador", message: `Solicitud rechazada. Motivo: ${reason}` } }),
      prisma.quoteRequestEvent.create({ data: { requestId: id, status: "REJECTED", eventType: "REQUEST_REJECTED", note: reason } }),
    ]);

    return NextResponse.json({
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
      note: { id: note.id, executiveName: note.executiveName, message: note.message, createdAt: note.createdAt.toISOString() },
    });
  } catch (error) {
    console.error("Error updating request status:", error);
    return invalid("No fue posible actualizar el estado de la solicitud", 500);
  }
}
