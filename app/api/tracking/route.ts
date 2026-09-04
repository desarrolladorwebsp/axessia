import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import {
  createTrackingToken,
  normalizeRut,
  normalizeTrackingIdentifier,
} from "@/lib/public-tracking";

import {
  readDevQuoteRequests,
  shouldUseJsonStorage,
} from "@/lib/dev-request-store";

function invalidResponse() {
  return NextResponse.json(
    {
      error:
        "No pudimos validar esos datos. Revisa tu número de solicitud y RUT.",
    },
    { status: 404 }
  );
}

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    requestNumber?: unknown;
    rut?: unknown;
  };

  const requestNumber =
    typeof payload.requestNumber === "string"
      ? normalizeTrackingIdentifier(payload.requestNumber)
      : "";

  const rut =
    typeof payload.rut === "string"
      ? normalizeRut(payload.rut)
      : "";

  if (!requestNumber || !rut) return invalidResponse();

  if (shouldUseJsonStorage()) {
    const record = (await readDevQuoteRequests()).find(
      (item) =>
        normalizeTrackingIdentifier(item.requestNumber) === requestNumber &&
        normalizeRut(item.requesterRut || item.customer?.rut || "") === rut
    );

    if (!record) return invalidResponse();

    return NextResponse.json({
      token: createTrackingToken(record.requestNumber),
      requestNumber: record.requestNumber,
    });
  }

  const records = await prisma.quoteRequest.findMany({
    select: {
      requestNumber: true,
      requesterRut: true,
    },
  });

  const record = records.find(
    (item) =>
      normalizeTrackingIdentifier(item.requestNumber ?? "") === requestNumber &&
      normalizeRut(item.requesterRut) === rut
  );

  if (!record?.requestNumber) return invalidResponse();

  return NextResponse.json({
    token: createTrackingToken(record.requestNumber),
    requestNumber: record.requestNumber,
  });
}