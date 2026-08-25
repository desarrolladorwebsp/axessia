"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SkeletonCards } from "../components/Skeletons";

interface QuoteRequestSummary {
  id: string;
  requestNumber: string | null;
  status: string;
  price: number | null;
  createdAt: string;
}

interface DashboardData {
  quotes: QuoteRequestSummary[];
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

        const result = (await response.json()) as DashboardData;
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

  const summaryCards = [
    {
      label: "Solicitudes",
      value: data ? String(data.pagination.total) : "0",
      subtitle: "Solicitudes recibidas",
    },
    {
      label: "En revisión",
      value: data
        ? String(
            data.quotes.filter((request) => ["RECEIVED", "REVIEWING"].includes(request.status)).length
          )
        : "0",
      subtitle: "Pendientes por análisis",
    },
    {
      label: "Cotizadas",
      value: data
        ? String(
            data.quotes.filter((request) => request.status === "QUOTED").length
          )
        : "0",
      subtitle: "Solicitudes con cotización",
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
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold font-display text-[var(--navy)]">
          Dashboard
        </h1>
        <p className="text-[var(--text-secondary)] mt-2">
          Bienvenido al sistema de gestión AXESSIA
        </p>
      </motion.div>

      {/* Loading State */}
      {isLoading ? (
        <SkeletonCards count={3} />
      ) : (
        /* Content State - Base structure for future metrics */
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Summary Cards */}
          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {summaryCards.map((card, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow"
              >
                <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                  {card.label}
                </p>
                <p className="text-3xl font-bold text-[var(--navy)] mb-1">
                  {card.value}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {card.subtitle}
                </p>
              </div>
            ))}
          </motion.div>

          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-[var(--border)] shadow-sm">
              <h2 className="text-lg font-semibold text-[var(--navy)] mb-4">
                Solicitudes por Estado
              </h2>
              <div className="space-y-3">
                {data ? (
                  [
                    { label: "Recibidas", total: data.quotes.filter((request) => request.status === "RECEIVED").length },
                    { label: "En revisión", total: data.quotes.filter((request) => request.status === "REVIEWING").length },
                    { label: "Cotizadas", total: data.quotes.filter((request) => request.status === "QUOTED").length },
                  ].map((status) => (
                    <div
                      key={status.label}
                      className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3"
                    >
                      <span className="text-sm font-medium text-[var(--navy)]">{status.label}</span>
                      <span className="text-sm font-bold text-[var(--blue)]">{status.total}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[var(--text-secondary)] text-sm">
                    Cargando solicitudes...
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[var(--border)] shadow-sm">
              <h2 className="text-lg font-semibold text-[var(--navy)] mb-4">
                Actividad Reciente
              </h2>
              <div className="space-y-3">
                {data && data.quotes.length > 0 ? (
                  data.quotes.slice(0, 3).map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center gap-3 pb-3 border-b border-[var(--border)] last:border-b-0"
                    >
                      <div className="w-2 h-2 rounded-full bg-[var(--blue)]" />
                      <div className="flex-1">
                        <p className="text-sm text-[var(--navy)] font-medium">
                          {request.requestNumber ?? "Solicitud sin número"}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {new Date(request.createdAt).toLocaleDateString("es-CL")}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[var(--text-secondary)] text-sm">
                    No hay solicitudes registradas aún.
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Info Section */}
          <motion.div variants={item} className="bg-gradient-to-r from-[var(--cyan)]/5 to-[var(--blue)]/5 rounded-2xl p-6 border border-[var(--border)]">
            <h3 className="text-lg font-semibold text-[var(--navy)] mb-2">
              💡 Seguimiento de solicitudes
            </h3>
            <p className="text-[var(--text-secondary)] text-sm">
              {error
                ? `No se pudieron cargar las solicitudes: ${error}`
                : "El panel refleja en tiempo real las solicitudes registradas desde la web y su estado actual."}
            </p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
