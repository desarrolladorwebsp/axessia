import { NextRequest, NextResponse } from "next/server";
import { getInternalActor } from "@/lib/internal-access";
import { loadActiveClientAlert } from "@/lib/internal-alerts/service";

export async function GET(request: NextRequest) {
  if (!await getInternalActor()) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const requestId = request.nextUrl.searchParams.get("requestId")?.trim() ?? "";
  if (!requestId) return NextResponse.json({ error: "Falta la solicitud." }, { status: 400 });

  return NextResponse.json(await loadActiveClientAlert(requestId));
}
