import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/customer-notifications/cron-auth";
import { runCustomerNotificationJob } from "@/lib/customer-notifications/job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handleCron(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const result = await runCustomerNotificationJob();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[CustomerNotifications] Cron job failed:", error);
    return NextResponse.json({ error: "No fue posible procesar las notificaciones." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
