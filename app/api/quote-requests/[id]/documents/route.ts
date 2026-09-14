import { NextRequest, NextResponse } from "next/server";

import {
  parseClientDocumentCustomLabel,
  parseClientDocumentKind,
  validateClientDocumentClassification,
} from "@/lib/client-document-type";
import {
  createStoredDocument,
  DocumentServiceError,
  serializeDocumentMeta,
} from "@/lib/documents/file-service";
import { getInternalActor } from "@/lib/internal-access";
import { readDevQuoteRequests, shouldUseJsonStorage, writeDevQuoteRequests } from "@/lib/dev-request-store";

type RouteContext = { params: Promise<{ id: string }> };

function handleServiceError(error: unknown) {
  if (error instanceof DocumentServiceError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("Error adding client document:", error);
  return NextResponse.json({ error: "No fue posible asociar el documento." }, { status: 500 });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!await getInternalActor()) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Envía el archivo en multipart/form-data." }, { status: 400 });
  }

  const formData = await request.formData();
  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File) || fileEntry.size <= 0) {
    return NextResponse.json({ error: "Selecciona un documento válido." }, { status: 400 });
  }

  const classification = validateClientDocumentClassification({
    documentKind: parseClientDocumentKind(formData.get("documentKind")),
    customLabel: parseClientDocumentCustomLabel(formData.get("customLabel")),
  });
  if (!classification.ok) {
    return NextResponse.json({ error: classification.error }, { status: 400 });
  }

  try {
    if (shouldUseJsonStorage()) {
      const records = await readDevQuoteRequests();
      const index = records.findIndex((record) => record.id === id);
      if (index === -1) return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
      const document = {
        id: `dev-document-${Date.now()}`,
        requestId: id,
        fileName: fileEntry.name,
        mimeType: fileEntry.type || "application/octet-stream",
        fileSize: fileEntry.size,
        storageKey: null,
        documentKind: classification.documentKind,
        customLabel: classification.customLabel,
        createdAt: new Date().toISOString(),
      };
      records[index] = { ...records[index], clientDocuments: [document, ...(records[index].clientDocuments ?? [])] };
      await writeDevQuoteRequests(records);
      return NextResponse.json({ ...document, hasStoredFile: false }, { status: 201 });
    }

    const document = await createStoredDocument("client-documents", id, fileEntry, {
      documentKind: classification.documentKind,
      customLabel: classification.customLabel,
    });
    return NextResponse.json(serializeDocumentMeta(document), { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
