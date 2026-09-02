"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Bell, CalendarDays, CheckCheck, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

// Fecha/hora en vivo para el bloque de utilidades del header (solo presentación)
function HeaderClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mounts client clock once to avoid SSR/client date mismatch
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!now) return null;

  return (
    <div className="hidden items-center gap-2 border-l border-[var(--border)] pl-4 sm:flex">
      <CalendarDays className="h-4 w-4 text-[var(--text-secondary)]" />
      <div>
        <p className="text-xs font-bold text-[var(--navy)]">
          {now.toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
        <p className="text-[10px] text-[var(--text-secondary)]">
          {now.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

export type PageHeaderProps = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  showUtilities?: boolean;
};

type NotificationType = "NEW_REQUEST" | "QUOTE_ACCEPTED" | "QUOTE_REJECTED";

type NotificationItem = {
  id: string;
  requestId: string;
  type: NotificationType;
  requestNumber: string;
  requesterName: string;
  createdAt: string;
};

const notificationMessages: Record<NotificationType, (requesterName: string) => string> = {
  NEW_REQUEST: (requesterName) => `Nueva solicitud de ${requesterName}`,
  QUOTE_ACCEPTED: (requesterName) => `${requesterName} aceptó su cotización`,
  QUOTE_REJECTED: (requesterName) => `${requesterName} rechazó su cotización`,
};

export default function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
  showUtilities = true,
}: PageHeaderProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  useEffect(() => {
    if (!showUtilities) return;

    const loadNotifications = async () => {
      try {
        setIsLoadingNotifications(true);
        const response = await fetch("/api/notifications", { cache: "no-store" });
        if (!response.ok) return;
        const result = (await response.json()) as { notifications: NotificationItem[] };
        setNotifications(result.notifications);
      } finally {
        setIsLoadingNotifications(false);
      }
    };

    void loadNotifications();
    window.addEventListener("focus", loadNotifications);
    return () => window.removeEventListener("focus", loadNotifications);
  }, [showUtilities]);

  const openNotification = async (notification: NotificationItem) => {
    try {
      const response = await fetch(`/api/notifications/${notification.id}/read`, { method: "POST" });
      if (!response.ok) return;
      setNotifications((current) => current.filter((item) => item.id !== notification.id));
      setIsNotificationsOpen(false);
      router.push(`/app/solicitudes/${notification.requestId}`);
    } catch {
      // Keep the pending notification visible if it could not be marked as read.
    }
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[var(--purple)] text-[var(--purple)]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--purple)]">{eyebrow}</p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-[var(--navy)] sm:text-3xl">
            {title}
          </h1>
          {description && <p className="mt-1 text-xs text-[var(--text-secondary)]">{description}</p>}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 xl:justify-end">
        {showUtilities && (
          <>
            <div className="relative">
            <button
              className="relative icon-button"
              type="button"
              aria-label="Notificaciones"
              aria-expanded={isNotificationsOpen}
              aria-controls="notification-panel"
              title="Notificaciones"
              onClick={() => setIsNotificationsOpen((isOpen) => !isOpen)}
            >
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                  {notifications.length}
                </span>
              )}
            </button>
            {isNotificationsOpen && (
              <div id="notification-panel" className="absolute left-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-[0_16px_36px_rgba(7,30,65,0.14)] xl:left-auto xl:right-0">
                <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                  <p className="text-xs font-extrabold text-[var(--navy)]">Notificaciones</p>
                  {isLoadingNotifications ? <LoaderCircle className="h-4 w-4 animate-spin text-[var(--blue)]" /> : <CheckCheck className="h-4 w-4 text-[var(--blue)]" aria-hidden="true" />}
                </div>
                {notifications.length > 0 ? (
                  <ul className="max-h-80 overflow-y-auto p-1.5">
                    {notifications.map((notification) => (
                      <li key={notification.id}>
                        <button type="button" onClick={() => void openNotification(notification)} className="w-full rounded-lg px-3 py-3 text-left transition-colors hover:bg-[var(--background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]">
                          <p className="text-xs font-extrabold text-[var(--navy)]">{notification.requestNumber}</p>
                          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{(notificationMessages[notification.type] ?? notificationMessages.NEW_REQUEST)(notification.requesterName)}</p>
                          <time className="mt-1 block text-[10px] font-semibold text-[var(--blue)]" dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}</time>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-6 text-center text-xs text-[var(--text-secondary)]">No tienes notificaciones nuevas.</p>
                )}
              </div>
            )}
            </div>
            <HeaderClock />
          </>
        )}
        {actions}
      </div>
    </motion.header>
  );
}
