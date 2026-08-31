import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDevNotifications, shouldUseJsonStorage } from "@/lib/dev-request-store";

export async function GET() {
  try {
    if (shouldUseJsonStorage()) {
      const notifications = await getDevNotifications();
      const unread = notifications.filter((notification) => !notification.isRead);
      return NextResponse.json({ notifications: unread, unreadCount: unread.length });
    }

    const notifications = await prisma.notification.findMany({
      where: { isRead: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        requestId: true,
        isRead: true,
        createdAt: true,
        request: { select: { requestNumber: true, requesterName: true } },
      },
    });
    return NextResponse.json({
      unreadCount: notifications.length,
      notifications: notifications.map((notification) => ({
        id: notification.id,
        requestId: notification.requestId,
        requestNumber: notification.request.requestNumber ?? "Solicitud sin número",
        requesterName: notification.request.requesterName,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "No fue posible obtener las notificaciones." }, { status: 500 });
  }
}