"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { SkeletonTable } from "../components/Skeletons";
import { EmptyState, ErrorState } from "../components/States";

interface Quote {
  id: string;
  requestNumber: string;
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
  quotes: Quote[];
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

function QuotesPageContent() {
  const searchParams = useSearchParams();
  const pageParam = searchParams.get("page") || "1";
  const currentPage = parseInt(pageParam);

  const [data, setData] = useState<PaginationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await fetch(
          `/api/quote-requests?page=${currentPage}&limit=10`
        );

        if (!response.ok) {
          throw new Error("Error al cargar solicitudes");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error desconocido"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuotes();
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    window.history.pushState(null, "", `?${params.toString()}`);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-[var(--navy)]">
            Solicitudes
          </h1>
          <p className="text-[var(--text-secondary)] mt-2">
            Gestiona las solicitudes de clientes pendientes y en revisión
          </p>
        </div>

        <Link
          href="/cotizar"
          className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-[var(--cyan)] to-[var(--blue)] shadow-[0_12px_28px_rgba(8,127,213,0.25)] hover:shadow-[0_16px_36px_rgba(8,127,213,0.35)] transition-shadow"
        >
          <Plus className="w-5 h-5" />
          Nueva solicitud
        </Link>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6">
          <ErrorState
            title="Error al cargar solicitudes"
            description={error}
            onRetry={() => setIsLoading(true)}
          />
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <SkeletonTable rows={10} />
      )}

      {/* Content State */}
      {!isLoading && data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {data.quotes.length === 0 ? (
            <EmptyState
              title="No hay solicitudes"
              description="Aún no hay solicitudes registradas en el sistema"
              action={{
                label: "Crear primera solicitud",
                onClick: () => (window.location.href = "/cotizar"),
              }}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--background)] border-b border-[var(--border)]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--navy)]">
                        # Solicitud
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--navy)]">
                        Cliente
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--navy)]">
                        Medicamentos
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--navy)]">
                        Estado
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--navy)]">
                        Precio
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--navy)]">
                        Fecha
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {data.quotes.map((quote) => (
                      <motion.tr
                        key={quote.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="hover:bg-[var(--background)] transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-[var(--blue)]">
                          {quote.requestNumber}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex flex-col">
                            <p className="font-medium text-[var(--navy)]">
                              {quote.customer.name}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {quote.customer.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {quote.medications.length > 0 ? (
                            <div className="space-y-1">
                              {quote.medications.slice(0, 2).map((med, idx) => (
                                <p key={idx} className="line-clamp-1">
                                  {med.commercialName}
                                </p>
                              ))}
                              {quote.medications.length > 2 && (
                                <p className="text-xs text-[var(--blue)]">
                                  +{quote.medications.length - 2} más
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              statusColors[quote.status] ||
                              "bg-gray-50 text-gray-700"
                            }`}
                          >
                            {statusLabels[quote.status] || quote.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-[var(--navy)]">
                          {quote.price ? `$${quote.price.toLocaleString()}` : "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {new Date(quote.createdAt).toLocaleDateString("es-CL")}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data.pagination.pages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] bg-[var(--background)]">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Página {data.pagination.page} de {data.pagination.pages} •
                    Total: {data.pagination.total} solicitudes
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-[var(--border)] text-[var(--navy)] hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {[...Array(data.pagination.pages)].map((_, i) => {
                      const page = i + 1;
                      if (
                        page === 1 ||
                        page === data.pagination.pages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              page === currentPage
                                ? "bg-[var(--blue)] text-white"
                                : "border border-[var(--border)] text-[var(--navy)] hover:bg-white"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      }
                      if (page === 2 || page === data.pagination.pages - 1) {
                        return (
                          <span
                            key={page}
                            className="px-2 text-[var(--text-secondary)]"
                          >
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === data.pagination.pages}
                      className="p-2 rounded-lg border border-[var(--border)] text-[var(--navy)] hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

export default function QuotesPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={10} />}>
      <QuotesPageContent />
    </Suspense>
  );
}
