import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInternalActor } from "@/lib/internal-access";
import { serializeDocumentMeta } from "@/lib/documents/file-service";
import { storedFileApiPath } from "@/lib/documents/urls";
import { resolveClientDocumentLabel } from "@/lib/client-document-type";
import { customerStatusLabel, isOpenRequestStatus } from "@/lib/customer-status";

type RouteContext = { params: Promise<{ id: string }> };

function laterDate(current: Date, next: Date | null | undefined) {
  if (!next) return current;
  return next > current ? next : current;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!await getInternalActor()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        rut: true,
        city: true,
        hasPendingRequest: true,
        createdAt: true,
        updatedAt: true,
        quotes: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            quoteNumber: true,
            version: true,
            status: true,
            total: true,
            createdAt: true,
            requestId: true,
            request: { select: { requestNumber: true } },
          },
        },
        requests: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            requestNumber: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            assignedExecutive: { select: { firstName: true, lastName: true } },
            prescriptions: {
              orderBy: { createdAt: "desc" },
              select: { id: true, fileName: true, mimeType: true, fileSize: true, storageKey: true, createdAt: true },
            },
            clientDocuments: {
              orderBy: { createdAt: "desc" },
              select: { id: true, fileName: true, mimeType: true, fileSize: true, storageKey: true, documentKind: true, customLabel: true, createdAt: true },
            },
            generatedMandate: { select: { fileName: true, generatedAt: true, sentAt: true } },
            mandateDocuments: {
              orderBy: { createdAt: "desc" },
              select: { id: true, fileName: true, mimeType: true, fileSize: true, storageKey: true, createdAt: true },
            },
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
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
    }

    const latestStatus = customer.requests[0]?.status ?? null;
    let lastActivity = laterDate(customer.updatedAt, customer.createdAt);

    const requests = customer.requests.map((request) => {
      lastActivity = laterDate(lastActivity, request.updatedAt);
      const executive = request.assignedExecutive;
      return {
        id: request.id,
        requestNumber: request.requestNumber,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
        executiveName: executive ? `${executive.firstName} ${executive.lastName}`.trim() : null,
      };
    });

    const quotes = customer.quotes.map((quote) => {
      lastActivity = laterDate(lastActivity, quote.createdAt);
      return {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        version: quote.version,
        status: quote.status,
        total: quote.total?.toString() ?? null,
        createdAt: quote.createdAt.toISOString(),
        requestId: quote.requestId,
        requestNumber: quote.request.requestNumber,
      };
    });

    const documents = customer.requests.flatMap((request) => {
      const requestNumber = request.requestNumber;
      const requestId = request.id;
      const prescriptions = request.prescriptions.map((prescription) => {
        const meta = serializeDocumentMeta(prescription);
        lastActivity = laterDate(lastActivity, prescription.createdAt);
        return {
          id: `prescription-${prescription.id}`,
          category: "prescription" as const,
          label: "Receta médica",
          fileName: meta.fileName,
          mimeType: meta.mimeType,
          fileSize: meta.fileSize,
          createdAt: meta.createdAt,
          requestId,
          requestNumber,
          href: meta.hasStoredFile ? storedFileApiPath("prescriptions", prescription.id) : null,
        };
      });

      const generated = request.generatedMandate
        ? (() => {
            lastActivity = laterDate(lastActivity, request.generatedMandate.sentAt ?? request.generatedMandate.generatedAt);
            return [{
              id: `generated-mandate-${requestId}`,
              category: "mandate" as const,
              label: request.generatedMandate.sentAt ? "Mandato enviado" : "Mandato generado",
              fileName: request.generatedMandate.fileName,
              mimeType: "application/pdf",
              fileSize: null,
              createdAt: (request.generatedMandate.sentAt ?? request.generatedMandate.generatedAt).toISOString(),
              requestId,
              requestNumber,
              href: `/api/mandates/${requestId}/pdf`,
            }];
          })()
        : [];

      const signedMandates = request.mandateDocuments.map((document) => {
        const meta = serializeDocumentMeta(document);
        lastActivity = laterDate(lastActivity, document.createdAt);
        return {
          id: `mandate-${document.id}`,
          category: "mandate" as const,
          label: "Mandato firmado",
          fileName: meta.fileName,
          mimeType: meta.mimeType,
          fileSize: meta.fileSize,
          createdAt: meta.createdAt,
          requestId,
          requestNumber,
          href: meta.hasStoredFile ? storedFileApiPath("mandate-documents", document.id) : null,
        };
      });

      const related = request.clientDocuments.map((document) => {
        const meta = serializeDocumentMeta(document);
        lastActivity = laterDate(lastActivity, document.createdAt);
        return {
          id: `client-${document.id}`,
          category: "related" as const,
          label: resolveClientDocumentLabel(meta),
          fileName: meta.fileName,
          mimeType: meta.mimeType,
          fileSize: meta.fileSize,
          createdAt: meta.createdAt,
          requestId,
          requestNumber,
          href: meta.hasStoredFile ? storedFileApiPath("client-documents", document.id) : null,
        };
      });

      return [...prescriptions, ...generated, ...signedMandates, ...related];
    }).sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    const activity = customer.requests
      .flatMap((request) => request.events.map((event) => {
        lastActivity = laterDate(lastActivity, event.createdAt);
        const actor = event.actor;
        return {
          id: event.id,
          eventType: event.eventType,
          status: event.status,
          note: event.note,
          createdAt: event.createdAt.toISOString(),
          requestId: request.id,
          requestNumber: request.requestNumber,
          actorName: actor ? `${actor.firstName} ${actor.lastName}`.trim() : null,
        };
      }))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 80);

    const totalRequests = requests.length;
    const activeRequests = requests.filter((request) => isOpenRequestStatus(request.status)).length;

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        rut: customer.rut,
        city: customer.city,
        createdAt: customer.createdAt.toISOString(),
        status: customerStatusLabel(latestStatus),
      },
      summary: {
        totalRequests,
        activeRequests,
        finishedRequests: totalRequests - activeRequests,
        quotesCount: quotes.length,
        lastActivity: lastActivity.toISOString(),
      },
      requests,
      quotes,
      documents,
      activity,
    });
  } catch (error) {
    console.error("Error fetching customer detail:", error);
    return NextResponse.json({ error: "Error al obtener el cliente." }, { status: 500 });
  }
}
