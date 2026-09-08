import { NextRequest, NextResponse } from "next/server";

import {
  deleteStoredDocument,
  DocumentServiceError,
  getStoredDocumentContent,
  replaceStoredDocument,
  serializeStoredDocument,
} from "@/lib/documents/file-service";
import { isManagedDocumentCategory } from "@/lib/documents/types";
import { getInternalActor } from "@/lib/internal-access";
import { sanitizeDownloadFileName } from "@/lib/storage/validation";

type RouteContext = { params: Promise<{ category: string; documentId: string }> };

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

function invalidCategory() {
  return NextResponse.json({ error: "Categoría de documento no válida." }, { status: 400 });
}

function handleServiceError(error: unknown) {
  if (error instanceof DocumentServiceError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("Error managing stored document:", error);
  return NextResponse.json({ error: "No fue posible completar la operación." }, { status: 500 });
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  if (!await getInternalActor()) return unauthorized();

  const { category, documentId } = await params;
  if (!isManagedDocumentCategory(category)) return invalidCategory();

  try {
    const { record, buffer } = await getStoredDocumentContent(category, documentId);
    const body = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    const fileName = sanitizeDownloadFileName(record.fileName);

    return new NextResponse(body, {
      headers: {
        "Content-Type": record.mimeType,
        "Content-Length": String(buffer.length),
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  if (!await getInternalActor()) return unauthorized();

  const { category, documentId } = await params;
  if (!isManagedDocumentCategory(category)) return invalidCategory();

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Envía el archivo en multipart/form-data." }, { status: 400 });
  }

  const formData = await request.formData();
  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File) || fileEntry.size <= 0) {
    return NextResponse.json({ error: "Selecciona un archivo válido." }, { status: 400 });
  }

  try {
    const record = await replaceStoredDocument(category, documentId, fileEntry);
    return NextResponse.json(serializeStoredDocument(record));
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  if (!await getInternalActor()) return unauthorized();

  const { category, documentId } = await params;
  if (!isManagedDocumentCategory(category)) return invalidCategory();

  try {
    await deleteStoredDocument(category, documentId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleServiceError(error);
  }
}
