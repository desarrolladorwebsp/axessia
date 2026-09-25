"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, CalendarRange, ClipboardList, FileCheck2, LayoutDashboard, PackageCheck, ReceiptText, Truck, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import PageHeader from "../components/PageHeader";
import InternalAlerts from "./InternalAlerts";

interface QuoteRequestSummary {
  id: string;
  requestNumber: string | null;
  status: string;
  price: number | null;
  createdAt: string;
}

interface DashboardData {
  quotes: QuoteRequestSummary[];
  summary?: {
    totalRequests: number;
    received: number;
    inManagement: number;
    quoted: number;
    pendingDecision: number;
    accepted: number;
    shipping: number;
    rejected: number;
    cancelled: number;
    completed: number;
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const monthLabel = useMemo(
    () =>
      new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString("es-CL", {
        month: "long",
        year: "numeric",
      }),
    [selectedMonth, selectedYear]
  );

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(`/api/quote-requests?page=1&limit=50&month=${selectedMonth}&year=${selectedYear}`);

        if (!response.ok) {
          throw new Error("No fue posible cargar las solicitudes del dashboard");
        }

        const result = (await response.json()) as DashboardData & {
          summary?: {
            totalRequests: number;
            received: number;
            inManagement: number;
            quoted: number;
            pendingDecision: number;
            accepted: number;
            shipping: number;
            rejected: number;
            cancelled: number;
            completed: number;
          };
        };
        setData(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error desconocido al cargar el dashboard"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedMonth, selectedYear]);

  const summary = data?.summary ?? {
    totalRequests: 0,
    received: 0,
    inManagement: 0,
    quoted: 0,
    pendingDecision: 0,
    accepted: 0,
    shipping: 0,
    rejected: 0,
    cancelled: 0,
    completed: 0,
  };
  const shareOfTotal = (value: number) =>
    summary.totalRequests > 0 ? `${Math.round((value / summary.totalRequests) * 100)}%` : "0%";

  const volumeKpis: DashboardKpi[] = [
    {
      label: "Solicitudes",
      value: summary.totalRequests,
      detail: "Recibidas en el período",
      share: summary.totalRequests > 0 ? "100%" : "0%",
      icon: FileCheck2,
      tone: "violet",
    },
    {
      label: "En gestión",
      value: summary.inManagement,
      detail: "Pendientes por gestionar",
      share: shareOfTotal(summary.inManagement),
      icon: ClipboardList,
      tone: "amber",
    },
    {
      label: "Cotizaciones realizadas",
      value: summary.quoted,
      detail: "Emitidas en el período",
      icon: ReceiptText,
      tone: "blue",
    },
  ];

  const outcomeKpis: DashboardKpi[] = [
    {
      label: "Aceptadas",
      value: summary.accepted,
      detail: "Cotización aceptada",
      share: shareOfTotal(summary.accepted),
      icon: BadgeCheck,
      tone: "emerald",
    },
    {
      label: "Rechazadas",
      value: summary.rejected,
      detail: "Solicitud rechazada",
      share: shareOfTotal(summary.rejected),
      icon: XCircle,
      tone: "rose",
    },
    {
      label: "En despacho",
      value: summary.shipping,
      detail: "En envío o entrega",
      share: shareOfTotal(summary.shipping),
      icon: Truck,
      tone: "cyan",
    },
    {
      label: "Finalizadas",
      value: summary.completed,
      detail: "Proceso cerrado",
      share: shareOfTotal(summary.completed),
      icon: PackageCheck,
      tone: "navy",
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  return (
    <div className="mx-auto w-full max-w-[1480px] px-1 py-2 sm:px-2 lg:px-4">
      <PageHeader
        icon={LayoutDashboard}
        eyebrow="Panel general"
        title="Dashboard"
        description="Bienvenido al sistema de gestión AXESSIA"
      />

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-white p-3 shadow-[0_10px_30px_rgba(7,30,65,0.03)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-[var(--navy)]">
          <CalendarRange className="h-4 w-4 text-[var(--blue)]" />
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Período</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
            Mes
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(Number(event.target.value))}
              className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-semibold text-[var(--navy)] outline-none ring-0 transition focus:border-[var(--blue)]"
            >
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {new Date(2024, index, 1).toLocaleDateString("es-CL", { month: "long" })}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
            Año
            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-semibold text-[var(--navy)] outline-none ring-0 transition focus:border-[var(--blue)]"
            >
              {Array.from({ length: 6 }, (_, index) => {
                const year = currentDate.getFullYear() - 5 + index;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </label>

          <span className="rounded-full bg-[var(--background)] px-3 py-2 text-xs font-bold text-[var(--blue)]">
            {monthLabel}
          </span>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      <InternalAlerts />

      {isLoading ? (
        <DashboardKpiSkeleton />
      ) : (
        <motion.div variants={container} initial="hidden" animate="visible" className="space-y-5">
          <motion.section
            variants={item}
            aria-label="Indicadores del período"
            className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[0_10px_30px_rgba(7,30,65,0.04)]"
          >
            <div className="grid grid-cols-2 divide-x divide-y divide-[var(--border)] sm:grid-cols-3 sm:divide-y-0">
              {volumeKpis.map((kpi, index) => (
                <KpiTile
                  key={kpi.label}
                  {...kpi}
                  emphasis
                  className={index === 0 ? "col-span-2 sm:col-span-1" : undefined}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-[var(--border)] border-t border-[var(--border)] bg-[var(--background)]/60 lg:grid-cols-4 lg:divide-y-0">
              {outcomeKpis.map((kpi) => (
                <KpiTile key={kpi.label} {...kpi} />
              ))}
            </div>
          </motion.section>

          <motion.div variants={item} className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[0_10px_30px_rgba(7,30,65,0.05)]">
              <h2 className="font-display text-lg font-extrabold text-[var(--navy)]">Solicitudes por estado</h2>
              <div className="mt-4 space-y-3">
                {data ? (
                  [
                    { label: "Recibidas", total: summary.received },
                    { label: "En gestión", total: summary.inManagement },
                    { label: "Cotizadas", total: summary.quoted },
                  ].map((status) => (
                    <div key={status.label} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
                      <span className="text-xs font-bold text-[var(--navy)]">{status.label}</span>
                      <span className="text-xs font-bold text-[var(--blue)]">{status.total}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">Cargando solicitudes...</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[0_10px_30px_rgba(7,30,65,0.05)]">
              <h2 className="font-display text-lg font-extrabold text-[var(--navy)]">Actividad reciente</h2>
              <div className="mt-4 space-y-3">
                {data && data.quotes.length > 0 ? (
                  data.quotes.slice(0, 3).map((request) => (
                    <div key={request.id} className="flex items-center gap-3 border-b border-[var(--border)] pb-3 last:border-b-0">
                      <div className="h-2 w-2 rounded-full bg-[var(--blue)]" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-[var(--navy)]">{request.requestNumber ?? "Solicitud sin número"}</p>
                        <p className="text-[10px] text-[var(--text-secondary)]">{new Date(request.createdAt).toLocaleDateString("es-CL")}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">No hay solicitudes registradas aún.</p>
                )}
              </div>
            </div>
          </motion.div>

        </motion.div>
      )}
    </div>
  );
}

type KpiTone = "violet" | "amber" | "blue" | "emerald" | "rose" | "cyan" | "navy";

type DashboardKpi = {
  label: string;
  value: number;
  detail: string;
  share?: string;
  icon: LucideIcon;
  tone: KpiTone;
};

const kpiTones: Record<KpiTone, { icon: string; share: string; bar: string }> = {
  violet: { icon: "bg-violet-50 text-[var(--purple)]", share: "text-[var(--purple)]", bar: "bg-[var(--purple)]" },
  amber: { icon: "bg-amber-50 text-amber-600", share: "text-amber-600", bar: "bg-amber-400" },
  blue: { icon: "bg-blue-50 text-[var(--blue)]", share: "text-[var(--blue)]", bar: "bg-[var(--blue)]" },
  emerald: { icon: "bg-emerald-50 text-emerald-600", share: "text-emerald-600", bar: "bg-emerald-500" },
  rose: { icon: "bg-rose-50 text-rose-600", share: "text-rose-600", bar: "bg-rose-400" },
  cyan: { icon: "bg-cyan-50 text-[var(--cyan)]", share: "text-[var(--cyan)]", bar: "bg-[var(--cyan)]" },
  navy: { icon: "bg-[var(--background)] text-[var(--navy)]", share: "text-[var(--navy)]", bar: "bg-[var(--navy)]" },
};

function KpiTile({
  label,
  value,
  detail,
  share,
  icon: Icon,
  tone,
  emphasis = false,
  className = "",
}: DashboardKpi & { emphasis?: boolean; className?: string }) {
  const style = kpiTones[tone];

  return (
    <article className={`relative min-w-0 px-3.5 py-3.5 pl-4 sm:px-4 sm:pl-5 ${emphasis ? "sm:py-4" : "sm:py-3.5"} ${className}`}>
      <span className={`absolute inset-y-3 left-0 w-0.5 rounded-full ${style.bar}`} aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.icon}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        {share ? <span className={`text-[10px] font-bold ${style.share}`}>{share}</span> : null}
      </div>
      <p className={`mt-2 font-display font-extrabold leading-none tracking-tight text-[var(--navy)] ${emphasis ? "text-[1.75rem]" : "text-2xl"}`}>
        {value}
      </p>
      <p className="mt-1.5 truncate text-xs font-semibold text-[var(--navy)]">{label}</p>
      <p className="truncate text-[10px] text-[var(--text-secondary)]">{detail}</p>
    </article>
  );
}

function DashboardKpiSkeleton() {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white" aria-hidden>
      <div className="grid grid-cols-2 divide-x divide-y divide-[var(--border)] sm:grid-cols-3 sm:divide-y-0">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={`volume-${index}`} className={`animate-pulse px-4 py-4 ${index === 0 ? "col-span-2 sm:col-span-1" : ""}`}>
            <div className="h-8 w-8 rounded-lg bg-gray-200" />
            <div className="mt-3 h-7 w-12 rounded bg-gray-200" />
            <div className="mt-2 h-3 w-24 rounded bg-gray-100" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-[var(--border)] border-t border-[var(--border)] lg:grid-cols-4 lg:divide-y-0">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={`outcome-${index}`} className="animate-pulse px-4 py-3.5">
            <div className="h-8 w-8 rounded-lg bg-gray-200" />
            <div className="mt-3 h-6 w-10 rounded bg-gray-200" />
            <div className="mt-2 h-3 w-20 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </section>
  );
}
