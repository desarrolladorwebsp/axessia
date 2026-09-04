import { NextResponse } from "next/server";

import { isValidRut } from "@/lib/customer-validation";
import { prisma } from "@/lib/prisma";
import { createTrackingToken } from "@/lib/public-tracking";
import {
  buildRequestNumberVariants,
  matchesTrackingCredentials,
  normalizeRutForComparison,
  normalizeTrackingIdentifier,
  normalizeTrackingRequestNumberForComparison,
} from "@/lib/tracking-normalization";

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
    { status: 404 },
  );
}

type TrackingRecord = {
  requestNumber: string | null;
  requesterRut: string;
};

function findMatchingRecord(
  records: TrackingRecord[],
  requestNumberNormalized: string,
  rutNormalized: string,
) {
  return records.find((item) =>
    matchesTrackingCredentials(item, requestNumberNormalized, rutNormalized),
  );
}

async function findTrackingRecord(
  rawRequestNumber: string,
  requestNumberNormalized: string,
  rutNormalized: string,
) {
  const variants = buildRequestNumberVariants(rawRequestNumber);

  if (variants.length > 0) {
    const candidates = await prisma.quoteRequest.findMany({
      where: { requestNumber: { in: variants } },
      select: { requestNumber: true, requesterRut: true },
    });

    const matched = findMatchingRecord(candidates, requestNumberNormalized, rutNormalized);
    if (matched?.requestNumber) return matched;
  }

  try {
    const rows = await prisma.$queryRaw<TrackingRecord[]>`
      SELECT requestNumber, requesterRut
      FROM QuoteRequest
      WHERE requestNumber IS NOT NULL
        AND LOWER(REGEXP_REPLACE(requestNumber, '[^a-zA-Z0-9]', '')) = ${requestNumberNormalized}
        AND LOWER(REGEXP_REPLACE(requesterRut, '[^0-9A-Z]', '')) = ${rutNormalized}
      LIMIT 1
    `;

    return rows[0] ?? null;
  } catch {
    const records = await prisma.quoteRequest.findMany({
      where: { requestNumber: { not: null } },
      select: { requestNumber: true, requesterRut: true },
    });

    return findMatchingRecord(records, requestNumberNormalized, rutNormalized) ?? null;
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      requestNumber?: unknown;
      rut?: unknown;
    };

    const rawRequestNumber =
      typeof payload.requestNumber === "string" ? payload.requestNumber.trim() : "";
    const rawRut = typeof payload.rut === "string" ? payload.rut.trim() : "";

    const requestNumberNormalized = rawRequestNumber
      ? normalizeTrackingRequestNumberForComparison(normalizeTrackingIdentifier(rawRequestNumber))
      : "";
    const rutNormalized = rawRut ? normalizeRutForComparison(rawRut) : "";

    if (!requestNumberNormalized || !rutNormalized || !isValidRut(rawRut)) {
      return invalidResponse();
    }

    if (shouldUseJsonStorage()) {
      const record = (await readDevQuoteRequests()).find((item) =>
        matchesTrackingCredentials(
          {
            requestNumber: item.requestNumber,
            requesterRut: item.requesterRut || item.customer?.rut || "",
          },
          requestNumberNormalized,
          rutNormalized,
        ),
      );

      if (!record) return invalidResponse();

      return NextResponse.json({
        token: createTrackingToken(record.requestNumber),
        requestNumber: record.requestNumber,
      });
    }

    const record = await findTrackingRecord(
      rawRequestNumber,
      requestNumberNormalized,
      rutNormalized,
    );

    if (!record?.requestNumber) return invalidResponse();

    return NextResponse.json({
      token: createTrackingToken(record.requestNumber),
      requestNumber: record.requestNumber,
    });
  } catch (error) {
    console.error("Error validating tracking credentials:", error);
    return NextResponse.json(
      { error: "No fue posible validar la solicitud en este momento." },
      { status: 500 },
    );
  }
}
