import { NextRequest, NextResponse } from "next/server";

import { parseClientDocumentCustomLabel } from "@/lib/client-document-type";
import {
  createStoredDocument,
  DocumentServiceError,
} from "@/lib/documents/file-service";
import { getInternalActor } from "@/lib/internal-access";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };
type UploadCategory = "prescription" | "mandate" | "related";

const UPLOAD_CATEGORIES: readonly UploadCategory[] = ["prescription", "mandate", "related"];

function isUploadCategory(value: string): value is UploadCategory {
  return (UPLOAD_CATEGORIES as readonly string[]).includes(value);
}

function handleServiceError(error: unknown) {
  if (error instanceof DocumentServiceError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("Error adding customer document:", error);
  return NextResponse.json({ error: "No fue posible asociar el documento." }, { status: 500 });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const actor = await getInternalActor();
  if (!actor) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id: customerId } = await params;
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Envía el archivo en multipart/form-data." }, { status: 400 });
  }

  const formData = await request.formData();
  const fileEntry = formData.get("file");
  const requestId = typeof formData.get("requestId") === "string" ? String(formData.get("requestId")).trim() : "";
  const categoryValue = typeof formData.get("category") === "string" ? String(formData.get("category")).trim() : "";
  const productName = parseClientDocumentCustomLabel(formData.get("productName"));

  if (!(fileEntry instanceof File) || fileEntry.size <= 0) {
    return NextResponse.json({ error: "Selecciona un documento válido." }, { status: 400 });
  }
  if (!requestId) {
    return NextResponse.json({ error: "Selecciona la solicitud asociada." }, { status: 400 });
  }
  if (!isUploadCategory(categoryValue)) {
    return NextResponse.json({ error: "Categoría de documento no válida." }, { status: 400 });
  }
  if (categoryValue === "related" && productName.length < 2) {
    return NextResponse.json({ error: "Indica el nombre del documento." }, { status: 400 });
  }

  const quoteRequest = await prisma.quoteRequest.findFirst({
    where: { id: requestId, customerId },
    select: { id: true, status: true },
  });
  if (!quoteRequest) {
    return NextResponse.json({ error: "La solicitud no pertenece a este cliente." }, { status: 404 });
  }

  try {
    if (categoryValue === "prescription") {
      await createStoredDocument("prescriptions", quoteRequest.id, fileEntry, { customerId });
    } else if (categoryValue === "mandate") {
      await createStoredDocument("mandate-documents", quoteRequest.id, fileEntry);
      await prisma.quoteRequestEvent.create({
        data: {
          requestId: quoteRequest.id,
          status: quoteRequest.status,
          eventType: "SIGNED_MANDATE_ATTACHED",
          actorId: actor.id,
        },
      });
    } else {
      await createStoredDocument("client-documents", quoteRequest.id, fileEntry, {
        documentKind: "OTHER",
        customLabel: productName,
      });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
