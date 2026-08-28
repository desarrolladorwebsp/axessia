import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTrackingToken, normalizeRut } from "@/lib/public-tracking";
import { readDevQuoteRequests, shouldUseJsonStorage } from "@/lib/dev-request-store";

function invalidResponse() {
  return NextResponse.json({ error: "No pudimos validar esos datos. Revisa tu número de solicitud y RUT." }, { status: 404 });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as { requestNumber?: unknown; rut?: unknown };
  const requestNumber = typeof payload.requestNumber === "string" ? payload.requestNumber.trim().toUpperCase() : "";
  const rut = typeof payload.rut === "string" ? normalizeRut(payload.rut) : "";
  if (!requestNumber || !rut) return invalidResponse();

  if (shouldUseJsonStorage()) {
    const record = (await readDevQuoteRequests()).find((item) => item.requestNumber.toUpperCase() === requestNumber && normalizeRut(item.requesterRut || item.customer?.rut || "") === rut);
    if (!record) return invalidResponse();
    return NextResponse.json({ token: createTrackingToken(record.requestNumber), requestNumber: record.requestNumber });
  }

  const record = await prisma.quoteRequest.findFirst({
    where: { requestNumber },
    select: { requestNumber: true, requesterRut: true },
  });
  if (!record?.requestNumber || normalizeRut(record.requesterRut) !== rut) return invalidResponse();
  return NextResponse.json({ token: createTrackingToken(record.requestNumber), requestNumber: record.requestNumber });
}
