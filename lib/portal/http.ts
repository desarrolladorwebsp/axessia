import { NextResponse } from "next/server";
import { DomainError, isDomainError } from "@/lib/domain-error";

export function portalErrorResponse(error: unknown) {
  if (isDomainError(error) || error instanceof DomainError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("Portal error:", error);
  return NextResponse.json({ error: "No fue posible completar la operación." }, { status: 500 });
}

export function unauthorizedPortalResponse() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}
