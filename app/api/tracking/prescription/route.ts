import { NextRequest, NextResponse } from "next/server";

import { getPrescriptionContentForRequestNumber } from "@/lib/documents/file-service";
import { readTrackingToken } from "@/lib/public-tracking";
import { sanitizeDownloadFileName } from "@/lib/storage/validation";

function unauthorized() {
  return NextResponse.json({ error: "La sesión de seguimiento no es válida o expiró." }, { status: 401 });
}

// Permite al cliente autenticado por token de seguimiento visualizar su receta adjunta.
export async function GET(request: NextRequest) {
  const requestNumber = readTrackingToken(request.nextUrl.searchParams.get("token") ?? "");
  if (!requestNumber) return unauthorized();

  try {
    const { record, buffer } = await getPrescriptionContentForRequestNumber(requestNumber);
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
  } catch {
    return NextResponse.json({ error: "Receta no encontrada." }, { status: 404 });
  }
}
