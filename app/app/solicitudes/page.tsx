"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { SkeletonTable } from "../components/Skeletons";
import { EmptyState, ErrorState } from "../components/States";

interface QuoteRequestItem {
  id: string;
  requestNumber: string | null;
  status: string;
  price: number | null;
  createdAt: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  medications: Array<{
    commercialName: string;
    activeIngredient: string;
  }>;
}

interface PaginationData {
  quotes: QuoteRequestItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

const statusLabels: Record<string, string> = {
  RECEIVED: "Recibida",
  REVIEWING: "En revisión",
  QUOTED: "Cotizada",
  APPROVED: "Aprobada",
  PROCESSING: "En proceso",
  DELIVERED: "Entregada",
};

const statusColors: Record<string, string> = {
  RECEIVED: "bg-blue-50 text-blue-700",
  REVIEWING: "bg-yellow-50 text-yellow-700",
  QUOTED: "bg-purple-50 text-purple-700",
  APPROVED: "bg-green-50 text-green-700",
  PROCESSING: "bg-orange-50 text-orange-700",
  DELIVERED: "bg-emerald-50 text-emerald-700",
};

export default function SolicitudesPage() {
  const [data, setData] = useState<PaginationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSolicitudes = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch("/api/quote-requests?page=1&limit=10");

        if (!response.ok) {
          throw new Error("Error al cargar solicitudes");
        }

        const result = (await response.json()) as PaginationData;
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSolicitudes();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-[var(--navy)]">
            Solicitudes
          </h1>
          <p className="text-[var(--text-secondary)] mt-2">
            Listado de solicitudes recibidas desde la web
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-[var(--cyan)] to-[var(--blue)] shadow-[0_12px_28px_rgba(8,127,213,0.25)] hover:shadow-[0_16px_36px_rgba(8,127,213,0.35)] transition-shadow"
        >
          <Plus className="w-5 h-5" />
          Nueva solicitud
        </Link>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorState
            title="Error al cargar solicitudes"
            description={error}
            onRetry={() => setIsLoading(true)}
          />
        </div>
      )}

      {isLoading && <SkeletonTable rows={10} />}

      {!isLoading && data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {data.quotes.length === 0 ? (
            <EmptyState
              title="No hay solicitudes"
              description="Aún no hay solicitudes registradas en la base de datos"
            />
          ) : (
            <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--background)] border-b border-[var(--border)]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--navy)]"># Solicitud</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--navy)]">Cliente</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--navy)]">Medicamentos</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--navy)]">Estado</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--navy)]">Precio</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--navy)]">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {data.quotes.map((request) => (
                      <motion.tr
                        key={request.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="hover:bg-[var(--background)] transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-[var(--blue)]">
                          {request.requestNumber ?? "Sin número"}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex flex-col">
                            <p className="font-medium text-[var(--navy)]">{request.customer.name}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{request.customer.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {request.medications.length > 0 ? (
                            <div className="space-y-1">
                              {request.medications.slice(0, 2).map((med, idx) => (
                                <p key={idx} className="line-clamp-1">{med.commercialName}</p>
                              ))}
                              {request.medications.length > 2 && (
                                <p className="text-xs text-[var(--blue)]">+{request.medications.length - 2} más</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              statusColors[request.status] || "bg-gray-50 text-gray-700"
                            }`}
                          >
                            {statusLabels[request.status] || request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-[var(--navy)]">
                          {request.price ? `$${Number(request.price).toLocaleString()}` : "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {new Date(request.createdAt).toLocaleDateString("es-CL")}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data.pagination.pages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] bg-[var(--background)]">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Página {data.pagination.page} de {data.pagination.pages} • Total: {data.pagination.total} solicitudes
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="p-2 rounded-lg border border-[var(--border)] text-[var(--navy)] hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={data.pagination.page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="p-2 rounded-lg border border-[var(--border)] text-[var(--navy)] hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={data.pagination.page === data.pagination.pages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
