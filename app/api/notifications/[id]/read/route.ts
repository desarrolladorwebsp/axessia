import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { markDevNotificationAsRead, shouldUseJsonStorage } from "@/lib/dev-request-store";
import { getInternalActor } from "@/lib/internal-access";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!await getInternalActor()) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    if (shouldUseJsonStorage()) {
      const notification = await markDevNotificationAsRead(id);
      if (!notification) return NextResponse.json({ error: "Notificación no encontrada." }, { status: 404 });
      return NextResponse.json(notification);
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
      select: { id: true, requestId: true, isRead: true },
    });
    return NextResponse.json(notification);
  } catch (error) {
    console.error("Error reading notification:", error);
    return NextResponse.json({ error: "No fue posible actualizar la notificación." }, { status: 500 });
  }
}