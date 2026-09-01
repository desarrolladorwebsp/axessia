import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readDevQuoteRequests, writeDevQuoteRequests, shouldUseJsonStorage } from "@/lib/dev-request-store";
import { getAxessiaLegalDetails } from "@/lib/axessia-legal";
import { generateMandatePdf } from "@/lib/mandate";
import { sendMandateEmail } from "@/lib/services/email";
import { getInternalActor } from "@/lib/internal-access";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type StatusPayload = { action?: unknown; executiveId?: unknown; reason?: unknown; note?: unknown; fileName?: unknown; mimeType?: unknown; fileSize?: unknown };

function invalid(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Roles allowed to be assigned as the executive responsible for a request.
const manageableRoles = ["EJECUTIVO", "ADMINISTRADOR"];
const rejectableStatuses = ["RECEIVED", "SOURCING", "QUOTED", "AWAITING_DECISION"];

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const actor = await getInternalActor();
  if (!actor) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    const payload = (await request.json()) as StatusPayload;
    const action = payload.action;
    if (action !== "CONFIRM_MANAGEMENT" && action !== "REJECT" && action !== "START_SHIPPING" && action !== "COMPLETE" && action !== "SEND_MANDATE" && action !== "ATTACH_SIGNED_MANDATE") return invalid("Acción no válida");

    if (action === "CONFIRM_MANAGEMENT") {
      const executiveId = typeof payload.executiveId === "string" ? payload.executiveId.trim() : "";
      if (!executiveId) return invalid("Selecciona un ejecutivo responsable");

      const executive = await prisma.user.findUnique({ where: { id: executiveId }, select: { id: true, firstName: true, lastName: true, role: true } });
      if (!executive || !manageableRoles.includes(executive.role)) return invalid("El ejecutivo seleccionado no es válido");

      const now = new Date();

      if (shouldUseJsonStorage()) {
        const records = await readDevQuoteRequests();
        const index = records.findIndex((record) => record.id === id);
        if (index === -1) return invalid("Solicitud no encontrada", 404);

        const currentStatus = records[index].status;
        const nextStatus = currentStatus === "RECEIVED" ? "SOURCING" : currentStatus;
        const assignmentEvent = {
          id: `dev-event-${Date.now()}`,
          status: nextStatus,
          eventType: "EXECUTIVE_ASSIGNED",
          note: `Ejecutivo asignado: ${executive.firstName} ${executive.lastName}`,
          createdAt: now.toISOString(),
        };

        records[index] = {
          ...records[index],
          status: nextStatus,
          updatedAt: now.toISOString(),
          assignedExecutive: { id: executive.id, firstName: executive.firstName, lastName: executive.lastName },
          events: [assignmentEvent, ...(records[index].events ?? [])],
        };
        await writeDevQuoteRequests(records);
        return NextResponse.json({ status: records[index].status, assignedExecutive: records[index].assignedExecutive, updatedAt: now.toISOString(), note: assignmentEvent });
      }

      const existing = await prisma.quoteRequest.findUnique({ where: { id }, select: { status: true } });
      if (!existing) return invalid("Solicitud no encontrada", 404);

      const nextStatus = existing.status === "RECEIVED" ? "SOURCING" : existing.status;
      const updated = await prisma.$transaction(async (transaction) => {
        const updatedRequest = await transaction.quoteRequest.update({
          where: { id },
          data: { status: nextStatus, assignedExecutiveId: executive.id },
          select: { status: true, updatedAt: true, assignedExecutive: { select: { id: true, firstName: true, lastName: true } } },
        });
        await transaction.quoteRequestEvent.create({
          data: {
            requestId: id,
            status: nextStatus,
            eventType: "EXECUTIVE_ASSIGNED",
            actorId: actor.id,
            note: `Ejecutivo asignado: ${executive.firstName} ${executive.lastName}`,
          },
        });
        return updatedRequest;
      });

      return NextResponse.json({ status: updated.status, assignedExecutive: updated.assignedExecutive, updatedAt: updated.updatedAt.toISOString() });
    }

    if (action === "SEND_MANDATE") {
      const company = getAxessiaLegalDetails();
      if (!company) return invalid("Configura AXESSIA_LEGAL_NAME y AXESSIA_LEGAL_RUT antes de enviar el mandato", 409);
      const note = typeof payload.note === "string" ? payload.note.trim().slice(0, 2000) : "";

      if (shouldUseJsonStorage()) {
        const records = await readDevQuoteRequests();
        const index = records.findIndex((record) => record.id === id);
        if (index === -1) return invalid("Solicitud no encontrada", 404);
        const record = records[index];
        const mandateName = record.patientName || record.requesterName;
        const mandateRut = record.patientRut || record.requesterRut;
        if (!mandateName || !mandateRut || !record.medications.length) return invalid("La solicitud no tiene información suficiente para generar el mandato", 409);
        const fileName = `Mandato-AXESSIA-${record.requestNumber}.pdf`;
        const pdf = await generateMandatePdf({ requestNumber: record.requestNumber, mandateName, mandateRut, condition: null, medications: record.medications }, company);
        await sendMandateEmail(record.requesterEmail, record.requesterName, record.requestNumber, fileName, pdf);
        const now = new Date().toISOString();
        records[index] = {
          ...record,
          updatedAt: now,
          generatedMandate: record.generatedMandate ?? { id: `dev-generated-mandate-${record.id}`, requestId: record.id, fileName, storageKey: `mandate-${record.id}`, generatedAt: now, sentAt: now },
          events: [{ id: `dev-event-${Date.now()}`, status: record.status, eventType: "MANDATE_GENERATED_AND_SENT", note: note || null, createdAt: now }, ...(record.events ?? [])],
        };
        await writeDevQuoteRequests(records);
        return NextResponse.json({ status: record.status, updatedAt: now, mandateUrl: `/api/mandates/${record.id}/pdf` });
      }

      const record = await prisma.quoteRequest.findUnique({
        where: { id },
        select: { id: true, requestNumber: true, requesterName: true, requesterEmail: true, requesterRut: true, patientName: true, patientRut: true, status: true, medications: { select: { commercialName: true, activeIngredient: true } } },
      });
      if (!record) return invalid("Solicitud no encontrada", 404);
      if (record.status !== "ACCEPTED") return invalid("El mandato solo puede enviarse después de aceptar la cotización", 409);
      const mandateName = record.patientName || record.requesterName;
      const mandateRut = record.patientRut || record.requesterRut;
      if (!record.requestNumber || !mandateName || !mandateRut || !record.medications.length) return invalid("La solicitud no tiene información suficiente para generar el mandato", 409);
      const fileName = `Mandato-AXESSIA-${record.requestNumber}.pdf`;
      const pdf = await generateMandatePdf({ requestNumber: record.requestNumber, mandateName, mandateRut, condition: null, medications: record.medications }, company);
      await sendMandateEmail(record.requesterEmail, record.requesterName, record.requestNumber, fileName, pdf);
      const now = new Date();
      await prisma.$transaction([
        prisma.generatedMandate.upsert({ where: { requestId: record.id }, update: { fileName, sentAt: now }, create: { requestId: record.id, fileName, storageKey: `mandate-${record.id}`, sentAt: now } }),
        prisma.quoteRequestEvent.create({ data: { requestId: record.id, status: record.status, eventType: "MANDATE_GENERATED_AND_SENT", note: note || null } }),
      ]);
      return NextResponse.json({ status: record.status, updatedAt: now.toISOString(), mandateUrl: `/api/mandates/${record.id}/pdf`, generatedMandate: { fileName, sentAt: now.toISOString() } });
    }

    if (action === "ATTACH_SIGNED_MANDATE") {
      const note = typeof payload.note === "string" ? payload.note.trim().slice(0, 2000) : "";
      const fileName = typeof payload.fileName === "string" ? payload.fileName.trim() : "";
      const mimeType = typeof payload.mimeType === "string" ? payload.mimeType.trim() : "";
      const fileSize = typeof payload.fileSize === "number" && Number.isFinite(payload.fileSize) ? Math.trunc(payload.fileSize) : 0;
      if (action === "ATTACH_SIGNED_MANDATE" && (!fileName || !mimeType || fileSize <= 0)) return invalid("Selecciona el mandato firmado para adjuntarlo");
      const eventType = "SIGNED_MANDATE_ATTACHED";

      if (shouldUseJsonStorage()) {
        const records = await readDevQuoteRequests();
        const index = records.findIndex((record) => record.id === id);
        if (index === -1) return invalid("Solicitud no encontrada", 404);
        const now = new Date().toISOString();
        const mandateDocuments = action === "ATTACH_SIGNED_MANDATE"
          ? [{ id: `dev-mandate-${Date.now()}`, requestId: id, fileName, mimeType, fileSize, storageKey: null, createdAt: now }, ...(records[index].mandateDocuments ?? [])]
          : records[index].mandateDocuments;
        records[index] = { ...records[index], updatedAt: now, mandateDocuments, events: [{ id: `dev-event-${Date.now()}`, status: records[index].status, eventType, note: note || null, createdAt: now }, ...(records[index].events ?? [])] };
        await writeDevQuoteRequests(records);
        return NextResponse.json({ status: records[index].status, updatedAt: now });
      }

      const existing = await prisma.quoteRequest.findUnique({ where: { id }, select: { status: true } });
      if (!existing) return invalid("Solicitud no encontrada", 404);
      const updated = await prisma.$transaction(async (transaction) => {
        if (action === "ATTACH_SIGNED_MANDATE") await transaction.mandateDocument.create({ data: { requestId: id, fileName, mimeType, fileSize } });
        const event = await transaction.quoteRequestEvent.create({ data: { requestId: id, status: existing.status, eventType, note: note || null } });
        return event;
      });
      return NextResponse.json({ status: existing.status, updatedAt: updated.createdAt.toISOString() });
    }

    if (action === "START_SHIPPING" || action === "COMPLETE") {
      const transition = action === "START_SHIPPING"
        ? { expected: "ACCEPTED", next: "SHIPPING", eventType: "SHIPPING_STARTED" }
        : { expected: "SHIPPING", next: "COMPLETED", eventType: "REQUEST_COMPLETED" };
      const note = typeof payload.note === "string" ? payload.note.trim().slice(0, 2000) : "";

      if (shouldUseJsonStorage()) {
        const records = await readDevQuoteRequests();
        const index = records.findIndex((record) => record.id === id);
        if (index === -1) return invalid("Solicitud no encontrada", 404);
        if (records[index].status !== transition.expected) return invalid("La solicitud no está disponible para esta acción", 409);
        const now = new Date().toISOString();
        records[index] = { ...records[index], status: transition.next as typeof records[number]["status"], updatedAt: now, events: [{ id: `dev-event-${Date.now()}`, status: transition.next, eventType: transition.eventType, note: note || null, createdAt: now }, ...(records[index].events ?? [])] };
        await writeDevQuoteRequests(records);
        return NextResponse.json({ status: transition.next, updatedAt: now });
      }

      const existing = await prisma.quoteRequest.findUnique({ where: { id }, select: { status: true } });
      if (!existing) return invalid("Solicitud no encontrada", 404);
      if (existing.status !== transition.expected) return invalid("La solicitud no está disponible para esta acción", 409);
      const updated = await prisma.$transaction(async (transaction) => {
        const request = await transaction.quoteRequest.update({ where: { id }, data: { status: transition.next as "SHIPPING" | "COMPLETED" }, select: { status: true, updatedAt: true } });
        await transaction.quoteRequestEvent.create({ data: { requestId: id, status: request.status, eventType: transition.eventType, note: note || null } });
        return request;
      });
      return NextResponse.json({ status: updated.status, updatedAt: updated.updatedAt.toISOString() });
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
