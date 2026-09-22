import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readDevQuoteRequests, writeDevQuoteRequests, shouldUseJsonStorage } from "@/lib/dev-request-store";
import { getAxessiaLegalDetails } from "@/lib/axessia-legal";
import { generateMandatePdf } from "@/lib/mandate";
import { sendMandateEmail } from "@/lib/services/email";
import { getInternalActor } from "@/lib/internal-access";
import { REQUEST_STATUS_LABELS } from "@/lib/request-status";
import { mandateProductsFromRequest, productTypePluralLabel, requestProductCount } from "@/lib/product-type";
import { notifyRequestCompleted } from "@/lib/customer-notifications/job";
import { portalRequestUrl } from "@/lib/customer-notifications/urls";
import { sendRequestCompletedEmail, sendShippingStartedEmail } from "@/lib/services/email";
import { buildShippingNote, validateShippingStart } from "@/lib/shipping";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type StatusPayload = { action?: unknown; executiveId?: unknown; reason?: unknown; note?: unknown; fileName?: unknown; mimeType?: unknown; fileSize?: unknown; estimatedDeliveryDate?: unknown; shippingMethod?: unknown };

function invalid(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Roles allowed to be assigned as the executive responsible for a request.
const manageableRoles = ["EJECUTIVO", "ADMINISTRADOR"];
const rejectableStatuses = ["RECEIVED", "SOURCING", "QUOTED", "AWAITING_DECISION"];
const mandateBlockedStatuses = ["REJECTED", "CANCELLED", "COMPLETED"];

function resolveMandateParty(record: {
  requestNumber?: string | null;
  requesterName?: string | null;
  requesterEmail?: string | null;
  requesterRut?: string | null;
  patientName?: string | null;
  patientRut?: string | null;
  productType?: string | null;
  customer?: { name?: string | null; email?: string | null; rut?: string | null } | null;
  medications?: Array<{ commercialName: string; activeIngredient?: string | null }>;
  medicalDevices?: Array<{ name: string; brand?: string | null; model?: string | null }>;
}) {
  const mandateName = (record.patientName || record.requesterName || record.customer?.name || "").trim();
  const mandateRut = (record.patientRut || record.requesterRut || record.customer?.rut || "").trim();
  const customerEmail = (record.requesterEmail || record.customer?.email || "").trim();
  const customerName = (record.requesterName || record.customer?.name || mandateName).trim();
  const requestNumber = (record.requestNumber || "").trim();
  const missing: string[] = [];
  if (!requestNumber) missing.push("número de solicitud");
  if (!mandateName) missing.push("nombre del cliente o paciente");
  if (!mandateRut) missing.push("RUT del cliente o paciente");
  if (!customerEmail) missing.push("correo del cliente");
  if (!requestProductCount(record)) missing.push(productTypePluralLabel(record.productType).toLowerCase());
  return { mandateName, mandateRut, customerEmail, customerName, requestNumber, missing };
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const actor = await getInternalActor();
  if (!actor) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    const payload = (await request.json()) as StatusPayload;
    const action = payload.action;
    if (action !== "CONFIRM_MANAGEMENT" && action !== "REJECT" && action !== "REACTIVATE" && action !== "START_SHIPPING" && action !== "COMPLETE" && action !== "SEND_MANDATE" && action !== "ATTACH_SIGNED_MANDATE") return invalid("Acción no válida");

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
        if (mandateBlockedStatuses.includes(record.status)) return invalid("El mandato no puede enviarse en el estado actual de la solicitud", 409);
        const party = resolveMandateParty(record);
        if (party.missing.length) return invalid(`No se puede generar el mandato. Faltan: ${party.missing.join(", ")}.`, 409);
        const fileName = `Mandato-AXESSIA-${party.requestNumber}.pdf`;
        const pdf = await generateMandatePdf({ requestNumber: party.requestNumber, mandateName: party.mandateName, mandateRut: party.mandateRut, condition: null, ...mandateProductsFromRequest(record) }, company);
        try {
          await sendMandateEmail(party.customerEmail, party.customerName, party.requestNumber, fileName, pdf);
        } catch (emailError) {
          return invalid(emailError instanceof Error ? emailError.message : "No fue posible enviar el mandato por correo", 409);
        }
        const now = new Date().toISOString();
        const generatedMandate = { id: record.generatedMandate?.id ?? `dev-generated-mandate-${record.id}`, requestId: record.id, fileName, storageKey: `mandate-${record.id}`, generatedAt: record.generatedMandate?.generatedAt ?? now, sentAt: now };
        records[index] = {
          ...record,
          updatedAt: now,
          generatedMandate,
          events: [{ id: `dev-event-${Date.now()}`, status: record.status, eventType: "MANDATE_GENERATED_AND_SENT", note: note || null, createdAt: now }, ...(record.events ?? [])],
        };
        await writeDevQuoteRequests(records);
        return NextResponse.json({ status: record.status, updatedAt: now, mandateUrl: `/api/mandates/${record.id}/pdf`, generatedMandate: { fileName, sentAt: now } });
      }

      const record = await prisma.quoteRequest.findUnique({
        where: { id },
        select: {
          id: true,
          requestNumber: true,
          requesterName: true,
          requesterEmail: true,
          requesterRut: true,
          patientName: true,
          patientRut: true,
          status: true,
          customer: { select: { name: true, email: true, rut: true } },
          productType: true,
          medications: { select: { commercialName: true, activeIngredient: true } },
          medicalDevices: { select: { name: true, brand: true, model: true } },
        },
      });
      if (!record) return invalid("Solicitud no encontrada", 404);
      if (mandateBlockedStatuses.includes(record.status)) return invalid("El mandato no puede enviarse en el estado actual de la solicitud", 409);
      const party = resolveMandateParty(record);
      if (party.missing.length) return invalid(`No se puede generar el mandato. Faltan: ${party.missing.join(", ")}.`, 409);
      const fileName = `Mandato-AXESSIA-${party.requestNumber}.pdf`;
      const pdf = await generateMandatePdf({ requestNumber: party.requestNumber, mandateName: party.mandateName, mandateRut: party.mandateRut, condition: null, ...mandateProductsFromRequest(record) }, company);
      try {
        await sendMandateEmail(party.customerEmail, party.customerName, party.requestNumber, fileName, pdf);
      } catch (emailError) {
        return invalid(emailError instanceof Error ? emailError.message : "No fue posible enviar el mandato por correo", 409);
      }
      const now = new Date();
      await prisma.$transaction([
        prisma.generatedMandate.upsert({ where: { requestId: record.id }, update: { fileName, sentAt: now }, create: { requestId: record.id, fileName, storageKey: `mandate-${record.id}`, sentAt: now } }),
        prisma.quoteRequestEvent.create({ data: { requestId: record.id, status: record.status, eventType: "MANDATE_GENERATED_AND_SENT", actorId: actor.id, note: note || null } }),
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
      let note = typeof payload.note === "string" ? payload.note.trim().slice(0, 2000) : "";

      if (shouldUseJsonStorage()) {
        const records = await readDevQuoteRequests();
        const index = records.findIndex((record) => record.id === id);
        if (index === -1) return invalid("Solicitud no encontrada", 404);
        if (records[index].status !== transition.expected) return invalid("La solicitud no está disponible para esta acción", 409);
        if (action === "START_SHIPPING") {
          const hasPaid = (records[index].events ?? []).some((event) => event.eventType === "PAYMENT_CONFIRMED");
          const shipping = validateShippingStart({ requestStatus: records[index].status, hasPaid, estimatedDeliveryDate: payload.estimatedDeliveryDate, shippingMethod: payload.shippingMethod });
          if (!shipping.ok) return invalid(shipping.error, 409);
          note = buildShippingNote(shipping);
        }
        const now = new Date().toISOString();
        records[index] = { ...records[index], status: transition.next as typeof records[number]["status"], updatedAt: now, events: [{ id: `dev-event-${Date.now()}`, status: transition.next, eventType: transition.eventType, note: note || null, createdAt: now }, ...(records[index].events ?? [])] };
        await writeDevQuoteRequests(records);
        if (transition.next === "COMPLETED") {
          try {
            await sendRequestCompletedEmail({
              customerEmail: records[index].requesterEmail,
              customerName: records[index].requesterName,
              requestNumber: records[index].requestNumber || records[index].id,
              requestUrl: portalRequestUrl(records[index].id),
            });
          } catch (emailError) {
            console.error("[CustomerNotifications] Failed to notify completed request:", emailError);
          }
        }
        if (action === "START_SHIPPING") {
          try {
            await sendShippingStartedEmail({ customerEmail: records[index].requesterEmail, customerName: records[index].requesterName, requestNumber: records[index].requestNumber || records[index].id, estimatedDeliveryDate: records[index].events?.[0]?.note?.match(/Fecha estimada de entrega: ([^\n]+)\./)?.[1] || "Por confirmar", shippingMethod: records[index].events?.[0]?.note?.match(/Forma de envío: ([^\n]+)\./)?.[1] || "Por confirmar", requestUrl: portalRequestUrl(records[index].id) });
          } catch (emailError) { console.error("[CustomerNotifications] Failed to notify shipping request:", emailError); }
        }
        return NextResponse.json({ status: transition.next, updatedAt: now });
      }

      const existing = await prisma.quoteRequest.findUnique({ where: { id }, select: { status: true, requesterEmail: true, requesterName: true, requestNumber: true, payments: { where: { status: "PAID" }, select: { id: true }, take: 1 } } });
      if (!existing) return invalid("Solicitud no encontrada", 404);
      if (existing.status !== transition.expected) return invalid("La solicitud no está disponible para esta acción", 409);
      if (action === "START_SHIPPING") {
        const shipping = validateShippingStart({ requestStatus: existing.status, hasPaid: existing.payments.length > 0, estimatedDeliveryDate: payload.estimatedDeliveryDate, shippingMethod: payload.shippingMethod });
        if (!shipping.ok) return invalid(shipping.error, 409);
        note = buildShippingNote(shipping);
      }
      const updated = await prisma.$transaction(async (transaction) => {
        const request = await transaction.quoteRequest.update({ where: { id }, data: { status: transition.next as "SHIPPING" | "COMPLETED" }, select: { status: true, updatedAt: true } });
        await transaction.quoteRequestEvent.create({ data: { requestId: id, status: request.status, eventType: transition.eventType, note: note || null } });
        return request;
      });
      if (transition.next === "COMPLETED") {
        try {
          await notifyRequestCompleted(id);
        } catch (emailError) {
          console.error("[CustomerNotifications] Failed to notify completed request:", emailError);
        }
      }
      if (action === "START_SHIPPING") {
        const shipping = validateShippingStart({ requestStatus: existing.status, hasPaid: existing.payments.length > 0, estimatedDeliveryDate: payload.estimatedDeliveryDate, shippingMethod: payload.shippingMethod });
        if (shipping.ok) {
          try { await sendShippingStartedEmail({ customerEmail: existing.requesterEmail, customerName: existing.requesterName, requestNumber: existing.requestNumber || id, estimatedDeliveryDate: shipping.estimatedDeliveryDate, shippingMethod: shipping.shippingMethod, requestUrl: portalRequestUrl(id) }); } catch (emailError) { console.error("[CustomerNotifications] Failed to notify shipping request:", emailError); }
        }
      }
      return NextResponse.json({ status: updated.status, updatedAt: updated.updatedAt.toISOString() });
    }

    if (action === "REACTIVATE") {
      const reason = typeof payload.reason === "string" ? payload.reason.trim() : "";
      const executiveId = typeof payload.executiveId === "string" ? payload.executiveId.trim() : "";
      if (!reason) return invalid("El motivo de reactivación es obligatorio");
      if (!executiveId) return invalid("Selecciona un ejecutivo responsable");

      const executive = await prisma.user.findUnique({ where: { id: executiveId }, select: { id: true, firstName: true, lastName: true, role: true } });
      if (!executive || !manageableRoles.includes(executive.role)) return invalid("El ejecutivo seleccionado no es válido");

      const actorName = `${actor.firstName} ${actor.lastName}`.trim();
      const executiveName = `${executive.firstName} ${executive.lastName}`.trim();
      const nextStatus = "SOURCING" as const;
      const now = new Date();
      const historyNote = [
        "Solicitud reactivada.",
        `Estado anterior: ${REQUEST_STATUS_LABELS.REJECTED}`,
        `Nuevo estado: ${REQUEST_STATUS_LABELS[nextStatus]}`,
        `Ejecutivo responsable: ${executiveName}`,
        `Acción realizada por: ${actorName}`,
        `Fecha: ${now.toLocaleString("es-CL")}`,
        `Motivo: ${reason}`,
      ].join("\n");

      if (shouldUseJsonStorage()) {
        const records = await readDevQuoteRequests();
        const index = records.findIndex((record) => record.id === id);
        if (index === -1) return invalid("Solicitud no encontrada", 404);
        if (records[index].status !== "REJECTED") return invalid("Solo se puede reactivar una solicitud rechazada", 409);

        const createdAt = now.toISOString();
        const note = { id: `note-${Date.now()}`, executiveName: actorName, message: `Solicitud reactivada. Motivo: ${reason}`, createdAt };
        const reactivationEvent = { id: `dev-event-${Date.now()}`, status: nextStatus, eventType: "REQUEST_REACTIVATED", note: historyNote, createdAt };
        records[index] = {
          ...records[index],
          status: nextStatus,
          updatedAt: createdAt,
          assignedExecutive: { id: executive.id, firstName: executive.firstName, lastName: executive.lastName },
          internalNotes: [note, ...(records[index].internalNotes ?? [])],
          events: [reactivationEvent, ...(records[index].events ?? [])],
        };
        await writeDevQuoteRequests(records);
        return NextResponse.json({ status: nextStatus, assignedExecutive: records[index].assignedExecutive, updatedAt: createdAt, note });
      }

      const existing = await prisma.quoteRequest.findUnique({ where: { id }, select: { status: true } });
      if (!existing) return invalid("Solicitud no encontrada", 404);
      if (existing.status !== "REJECTED") return invalid("Solo se puede reactivar una solicitud rechazada", 409);

      const [updated, note] = await prisma.$transaction([
        prisma.quoteRequest.update({
          where: { id },
          data: { status: nextStatus, assignedExecutiveId: executive.id },
          select: { status: true, updatedAt: true, assignedExecutive: { select: { id: true, firstName: true, lastName: true } } },
        }),
        prisma.quoteRequestNote.create({ data: { requestId: id, executiveName: actorName, message: `Solicitud reactivada. Motivo: ${reason}` } }),
        prisma.quoteRequestEvent.create({
          data: {
            requestId: id,
            status: nextStatus,
            eventType: "REQUEST_REACTIVATED",
            actorId: actor.id,
            note: historyNote,
          },
        }),
      ]);

      return NextResponse.json({
        status: updated.status,
        assignedExecutive: updated.assignedExecutive,
        updatedAt: updated.updatedAt.toISOString(),
        note: { id: note.id, executiveName: note.executiveName, message: note.message, createdAt: note.createdAt.toISOString() },
      });
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
