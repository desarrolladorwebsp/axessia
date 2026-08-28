"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Bell, CalendarDays } from "lucide-react";

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
  notificationCount?: number;
  showUtilities?: boolean;
};

export default function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
  notificationCount = 3,
  showUtilities = true,
}: PageHeaderProps) {
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
            <button className="relative icon-button" aria-label="Notificaciones" title="Notificaciones">
              <Bell className="h-4 w-4" />
              {notificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                  {notificationCount}
                </span>
              )}
            </button>
            <HeaderClock />
          </>
        )}
        {actions}
      </div>
    </motion.header>
  );
}
