"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--blue)]">
            Gestión
          </p>
          <h1 className="mt-2 text-2xl font-bold font-display text-[var(--navy)] sm:text-3xl">
            Solicitudes
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Listado de solicitudes recibidas desde la web
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white bg-gradient-to-r from-[var(--cyan)] to-[var(--blue)] shadow-[0_12px_28px_rgba(8,127,213,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(8,127,213,0.35)]"
        >
          <Plus className="w-4 h-4" />
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
          className="w-full"
        >
          {data.quotes.length === 0 ? (
            <EmptyState
              title="No hay solicitudes"
              description="Aún no hay solicitudes registradas en la base de datos"
            />
          ) : (
            <div className="w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-white/80 backdrop-blur-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full w-full border-separate border-spacing-0">
                  <thead className="bg-[var(--background)]">
                    <tr>
                      <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--navy)] sm:px-4 lg:px-6"># Solicitud</th>
                      <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--navy)] sm:px-4 lg:px-6">Cliente</th>
                      <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--navy)] sm:px-4 lg:px-6">Medicamentos</th>
                      <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--navy)] sm:px-4 lg:px-6">Estado</th>
                      <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--navy)] sm:px-4 lg:px-6">Precio</th>
                      <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--navy)] sm:px-4 lg:px-6">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.quotes.map((request) => (
                      <motion.tr
                        key={request.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        role="link"
                        tabIndex={0}
                        onClick={() => router.push(`/app/solicitudes/${request.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(`/app/solicitudes/${request.id}`);
                          }
                        }}
                        className="cursor-pointer border-t border-[var(--border)] outline-none transition-colors hover:bg-[#E7EEF8] focus-visible:bg-[#E7EEF8] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--blue)]"
                      >
                        <td className="px-3 py-4 text-sm font-semibold text-[var(--blue)] sm:px-4 lg:px-6">
                          {request.requestNumber ?? "Sin número"}
                        </td>
                        <td className="px-3 py-4 text-sm sm:px-4 lg:px-6">
                          <div className="flex min-w-0 flex-col">
                            <p className="truncate font-medium text-[var(--navy)]">{request.customer.name}</p>
                            <p className="break-all text-xs text-[var(--text-secondary)]">{request.customer.email}</p>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm text-[var(--text-secondary)] sm:px-4 lg:px-6">
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
                        <td className="px-3 py-4 text-sm sm:px-4 lg:px-6">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              statusColors[request.status] || "bg-gray-50 text-gray-700"
                            }`}
                          >
                            {statusLabels[request.status] || request.status}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-sm font-semibold text-[var(--navy)] sm:px-4 lg:px-6">
                          {request.price ? `$${Number(request.price).toLocaleString()}` : "-"}
                        </td>
                        <td className="px-3 py-4 text-sm text-[var(--text-secondary)] sm:px-4 lg:px-6">
                          {new Date(request.createdAt).toLocaleDateString("es-CL")}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data.pagination.pages > 1 && (
                <div className="flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--background)] px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-4 lg:px-6">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Página {data.pagination.page} de {data.pagination.pages} • Total: {data.pagination.total} solicitudes
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--border)] bg-white p-2 text-[var(--navy)] transition-colors hover:bg-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={data.pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--border)] bg-white p-2 text-[var(--navy)] transition-colors hover:bg-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={data.pagination.page === data.pagination.pages}
                    >
                      <ChevronRight className="h-4 w-4" />
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
