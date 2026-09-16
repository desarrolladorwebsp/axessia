import { NextResponse } from "next/server";
import { getAxessiaLegalDetails } from "@/lib/axessia-legal";
import { DomainError } from "@/lib/domain-error";
import {
  DocumentServiceError,
  getStoredDocumentContent,
} from "@/lib/documents/file-service";
import { isManagedDocumentCategory } from "@/lib/documents/types";
import { generateMandatePdf } from "@/lib/mandate";
import { prisma } from "@/lib/prisma";
import { mandateProductsFromRequest } from "@/lib/product-type";
import { scopedToCustomer } from "@/lib/portal/scope";
import { isPortalDocumentCategory } from "@/lib/portal/document-categories";
import { sanitizeDownloadFileName } from "@/lib/storage/validation";

export { isPortalDocumentCategory, PORTAL_DOCUMENT_CATEGORIES, type PortalDocumentCategory } from "@/lib/portal/document-categories";

function fileResponse(buffer: Buffer | Uint8Array, fileName: string, mimeType: string) {
  const bytes = buffer instanceof Buffer ? buffer : Buffer.from(buffer);
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new NextResponse(body, {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `inline; filename="${sanitizeDownloadFileName(fileName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

async function findOwnedStoredDocument(customerId: string, category: "prescriptions" | "client-documents" | "mandate-documents", documentId: string) {
  const owner = scopedToCustomer(customerId);
  if (category === "prescriptions") {
    return prisma.prescription.findFirst({ where: { id: documentId, request: owner }, select: { id: true } });
  }
  if (category === "client-documents") {
    return prisma.clientDocument.findFirst({ where: { id: documentId, request: owner }, select: { id: true } });
  }
  return prisma.mandateDocument.findFirst({ where: { id: documentId, request: owner }, select: { id: true } });
}

export async function getPortalDocumentResponse(customerId: string, category: string, documentId: string) {
  if (!isPortalDocumentCategory(category)) {
    throw new DomainError("Categoría de documento no válida.", 400);
  }

  if (category === "generated-mandate") {
    const mandate = await prisma.generatedMandate.findFirst({
      where: { requestId: documentId, request: scopedToCustomer(customerId) },
      select: {
        fileName: true,
        request: {
          select: {
            requestNumber: true,
            requesterName: true,
            requesterRut: true,
            patientName: true,
            patientRut: true,
            productType: true,
            medications: { select: { commercialName: true, activeIngredient: true } },
            medicalDevices: { select: { name: true, brand: true, model: true } },
          },
        },
      },
    });
    const requestNumber = mandate?.request.requestNumber;
    if (!mandate || !requestNumber) {
      throw new DomainError("Documento no encontrado.", 404);
    }

    const company = getAxessiaLegalDetails();
    if (!company) {
      throw new DomainError("Falta la configuración legal de AXESSIA.", 409);
    }

    const request = mandate.request;
    const pdf = await generateMandatePdf({
      requestNumber,
      mandateName: request.patientName || request.requesterName,
      mandateRut: request.patientRut || request.requesterRut,
      condition: null,
      ...mandateProductsFromRequest(request),
    }, company);
    return fileResponse(pdf, mandate.fileName, "application/pdf");
  }

  if (!isManagedDocumentCategory(category)) {
    throw new DomainError("Categoría de documento no válida.", 400);
  }

  const owned = await findOwnedStoredDocument(customerId, category, documentId);
  if (!owned) {
    throw new DomainError("Documento no encontrado.", 404);
  }

  try {
    const { record, buffer } = await getStoredDocumentContent(category, documentId);
    return fileResponse(buffer, record.fileName, record.mimeType);
  } catch (error) {
    if (error instanceof DocumentServiceError) {
      throw new DomainError("Documento no encontrado.", 404);
    }
    throw error;
  }
}
