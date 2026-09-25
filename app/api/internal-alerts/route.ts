import { NextResponse } from "next/server";
import { getInternalActor } from "@/lib/internal-access";
import { unavailableDashboardAlerts } from "@/lib/internal-alerts/load";
import { loadDashboardInternalAlerts } from "@/lib/internal-alerts/service";

export async function GET() {
  if (!await getInternalActor()) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    return NextResponse.json(await loadDashboardInternalAlerts());
  } catch (error) {
    console.error("No fue posible preparar las alertas internas del dashboard:", error);
    return NextResponse.json(unavailableDashboardAlerts());
  }
}
