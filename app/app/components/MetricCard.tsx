"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

export type MetricTone = "violet" | "blue" | "yellow" | "green" | "neutral";

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  trend: string;
  icon: LucideIcon;
  tone?: MetricTone;
};

const tones: Record<MetricTone, { icon: string; bar: string; trend: string }> = {
  violet: { icon: "bg-violet-50 text-[var(--purple)]", bar: "bg-[var(--purple)]", trend: "text-[var(--purple)]" },
  blue: { icon: "bg-blue-50 text-[var(--blue)]", bar: "bg-[var(--blue)]", trend: "text-[var(--blue)]" },
  yellow: { icon: "bg-amber-50 text-amber-600", bar: "bg-amber-400", trend: "text-amber-600" },
  green: { icon: "bg-emerald-50 text-emerald-600", bar: "bg-emerald-500", trend: "text-emerald-600" },
  neutral: { icon: "bg-slate-100 text-[var(--text-secondary)]", bar: "bg-slate-400", trend: "text-[var(--text-secondary)]" },
};

export default function MetricCard({ label, value, detail, trend, icon: Icon, tone = "blue" }: MetricCardProps) {
  const style = tones[tone];

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25 }}
      className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-[0_10px_30px_rgba(7,30,65,0.04)]"
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.icon}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-medium text-[var(--text-secondary)]">{label}</p>
          <span className={`shrink-0 text-[10px] font-bold ${style.trend}`}>{trend}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="font-display text-xl font-extrabold leading-tight tracking-tight text-[var(--navy)]">{value}</p>
          <p className="truncate text-[11px] text-[var(--text-secondary)]">{detail}</p>
        </div>
      </div>
    </motion.article>
  );
}
