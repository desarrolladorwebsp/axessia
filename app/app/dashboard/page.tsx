"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarRange, ClipboardList, FileCheck2, LayoutDashboard, ReceiptText } from "lucide-react";
import { SkeletonCards } from "../components/Skeletons";
import PageHeader from "../components/PageHeader";
import MetricCard from "../components/MetricCard";

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
  const inManagement = summary.inManagement;
  const quoted = summary.quoted;

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

      {isLoading ? (
        <SkeletonCards count={3} />
      ) : (
        <motion.div variants={container} initial="hidden" animate="visible" className="space-y-5">
          <motion.section variants={item} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Solicitudes" value={String(summary.totalRequests)} detail="Solicitudes recibidas durante el mes" trend="0%" icon={FileCheck2} tone="violet" />
            <MetricCard label="En gestión" value={String(inManagement)} detail="Pendientes por gestionar" trend="0%" icon={ClipboardList} tone="yellow" />
            <MetricCard label="Cotizaciones realizadas" value={String(quoted)} detail="Cotizaciones emitidas durante el mes" trend="0%" icon={ReceiptText} tone="green" />
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
