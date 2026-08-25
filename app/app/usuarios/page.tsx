"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { SkeletonTable } from "../components/Skeletons";
import { EmptyState, ErrorState } from "../components/States";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  rut: string;
  role: string;
  createdAt: string;
}

interface PaginationData {
  users: User[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

const roleLabels: Record<string, string> = {
  EJECUTIVO: "Ejecutivo",
  ADMINISTRADOR: "Administrador",
};

const roleColors: Record<string, string> = {
  EJECUTIVO: "bg-blue-50 text-blue-700",
  ADMINISTRADOR: "bg-purple-50 text-purple-700",
};

function UsersPageContent() {
  const searchParams = useSearchParams();
  const pageParam = searchParams.get("page") || "1";
  const currentPage = parseInt(pageParam);

  const [data, setData] = useState<PaginationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await fetch(
          `/api/users?page=${currentPage}&limit=10`
        );

        if (!response.ok) {
          throw new Error("Error al cargar usuarios");
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

    fetchUsers();
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
            Usuarios Internos
          </h1>
          <p className="text-[var(--text-secondary)] mt-2">
            Gestiona los usuarios del sistema AXESSIA
          </p>
        </div>

        <Link
          href="/app/usuarios/crear"
          className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-[var(--cyan)] to-[var(--blue)] shadow-[0_12px_28px_rgba(8,127,213,0.25)] hover:shadow-[0_16px_36px_rgba(8,127,213,0.35)] transition-shadow"
        >
          <Plus className="w-5 h-5" />
          Crear Usuario
        </Link>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6">
          <ErrorState
            title="Error al cargar usuarios"
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
          {data.users.length === 0 ? (
            <EmptyState
              title="Sin usuarios internos"
              description="Aún no hay usuarios internos registrados en el sistema"
              action={{
                label: "Crear primer usuario",
                onClick: () => (window.location.href = "/app/usuarios/crear"),
              }}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--background)] border-b border-[var(--border)]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--navy)]">
                        Nombre
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--navy)]">
                        Correo
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--navy)]">
                        RUT
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--navy)]">
                        Rol
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--navy)]">
                        Registro
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {data.users.map((user) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="hover:bg-[var(--background)] transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-[var(--navy)]">
                          {user.firstName} {user.lastName}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {user.rut}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              roleColors[user.role] ||
                              "bg-gray-50 text-gray-700"
                            }`}
                          >
                            {roleLabels[user.role] || user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {new Date(user.createdAt).toLocaleDateString("es-CL")}
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
                    Total: {data.pagination.total} usuarios
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

export default function UsersPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={10} />}>
      <UsersPageContent />
    </Suspense>
  );
}
