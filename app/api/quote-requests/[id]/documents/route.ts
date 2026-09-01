import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readDevQuoteRequests, shouldUseJsonStorage, writeDevQuoteRequests } from "@/lib/dev-request-store";
import { getInternalActor } from "@/lib/internal-access";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!await getInternalActor()) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const body = (await request.json()) as { fileName?: unknown; mimeType?: unknown; fileSize?: unknown };
  const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType.trim() : "";
  const fileSize = typeof body.fileSize === "number" && Number.isFinite(body.fileSize) ? Math.trunc(body.fileSize) : 0;
  if (!fileName || !mimeType || fileSize <= 0) return NextResponse.json({ error: "Selecciona un documento válido." }, { status: 400 });

  try {
    if (shouldUseJsonStorage()) {
      const records = await readDevQuoteRequests();
      const index = records.findIndex((record) => record.id === id);
      if (index === -1) return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
      const document = { id: `dev-document-${Date.now()}`, requestId: id, fileName, mimeType, fileSize, storageKey: null, createdAt: new Date().toISOString() };
      records[index] = { ...records[index], clientDocuments: [document, ...(records[index].clientDocuments ?? [])] };
      await writeDevQuoteRequests(records);
      return NextResponse.json(document, { status: 201 });
    }

    const document = await prisma.clientDocument.create({ data: { requestId: id, fileName, mimeType, fileSize } });
    return NextResponse.json({ ...document, createdAt: document.createdAt.toISOString() }, { status: 201 });
  } catch (error) {
    console.error("Error adding client document:", error);
    return NextResponse.json({ error: "No fue posible asociar el documento." }, { status: 500 });
  }
}