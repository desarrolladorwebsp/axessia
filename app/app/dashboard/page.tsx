"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardList, FileCheck2, LayoutDashboard, ReceiptText } from "lucide-react";
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

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch("/api/quote-requests?page=1&limit=50");

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
  }, []);

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

      {isLoading ? (
        <SkeletonCards count={3} />
      ) : (
        <motion.div variants={container} initial="hidden" animate="visible" className="space-y-5">
          <motion.section variants={item} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Solicitudes" value={String(summary.totalRequests)} detail="Solicitudes recibidas" trend="0%" icon={FileCheck2} tone="violet" />
            <MetricCard label="En gestión" value={String(inManagement)} detail="Pendientes por gestionar" trend="0%" icon={ClipboardList} tone="yellow" />
            <MetricCard label="Cotizadas" value={String(quoted)} detail="Solicitudes con cotización" trend="0%" icon={ReceiptText} tone="green" />
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
