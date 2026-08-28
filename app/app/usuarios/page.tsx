"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, ShieldCheck, UserCog, Users as UsersIcon } from "lucide-react";
import { SkeletonTable } from "../components/Skeletons";
import { EmptyState, ErrorState } from "../components/States";
import PageHeader from "../components/PageHeader";
import MetricCard from "../components/MetricCard";
import { PrimaryButton } from "../components/Buttons";
import StatusBadge, { type StatusTone } from "../components/StatusBadge";
import Avatar from "../components/Avatar";
import { FilterBar, SearchField, FilterSelect } from "../components/FilterBar";
import Pagination from "../components/Pagination";

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

const roleTones: Record<string, StatusTone> = {
  EJECUTIVO: "info",
  ADMINISTRADOR: "accent",
};

function UsersPageContent() {
  const searchParams = useSearchParams();
  const pageParam = searchParams.get("page") || "1";
  const currentPage = parseInt(pageParam);

  const [data, setData] = useState<PaginationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("Todos los roles");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await fetch(`/api/users?page=${currentPage}&limit=10`);

        if (!response.ok) {
          throw new Error("Error al cargar usuarios");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
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

  const filteredUsers = useMemo(
    () =>
      data?.users.filter((user) => {
        const matchesQuery = `${user.firstName} ${user.lastName} ${user.email} ${user.rut}`.toLowerCase().includes(query.toLowerCase());
        const matchesRole = role === "Todos los roles" || roleLabels[user.role] === role;
        return matchesQuery && matchesRole;
      }) ?? [],
    [data, query, role],
  );

  const admins = data?.users.filter((user) => user.role === "ADMINISTRADOR").length ?? 0;
  const executives = data?.users.filter((user) => user.role === "EJECUTIVO").length ?? 0;

  return (
    <div className="mx-auto w-full max-w-[1480px] px-1 py-2 sm:px-2 lg:px-4">
      <PageHeader
        icon={UsersIcon}
        eyebrow="Administración"
        title="Usuarios internos"
        description="Gestiona los usuarios del sistema AXESSIA"
        actions={<PrimaryButton href="/app/usuarios/crear" icon={Plus}>Crear usuario</PrimaryButton>}
      />

      {error && <ErrorState title="Error al cargar usuarios" description={error} onRetry={() => setIsLoading(true)} />}
      {isLoading && <SkeletonTable rows={10} />}

      {!isLoading && data && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-5">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Total de usuarios" value={String(data.pagination.total)} detail="Cuentas internas registradas" trend="●" icon={UsersIcon} tone="violet" />
            <MetricCard label="Administradores" value={String(admins)} detail="En la página actual" trend="●" icon={ShieldCheck} tone="blue" />
            <MetricCard label="Ejecutivos" value={String(executives)} detail="En la página actual" trend="●" icon={UserCog} tone="green" />
          </section>

          {data.users.length === 0 ? (
            <EmptyState
              title="Sin usuarios internos"
              description="Aún no hay usuarios internos registrados en el sistema"
              action={{ label: "Crear primer usuario", onClick: () => (window.location.href = "/app/usuarios/crear") }}
            />
          ) : (
            <>
              <FilterBar>
                <SearchField value={query} onChange={setQuery} placeholder="Buscar por nombre, correo o RUT" label="Buscar usuarios" />
                <FilterSelect label="Rol" value={role} onChange={setRole} options={["Todos los roles", "Ejecutivo", "Administrador"]} />
              </FilterBar>

              <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[0_10px_30px_rgba(7,30,65,0.05)]">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                        {["Usuario", "RUT", "Rol", "Registro"].map((header) => (
                          <th key={header} className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--navy)]">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user, index) => (
                        <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.04 }} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]">
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={`${user.firstName} ${user.lastName}`} />
                              <div className="min-w-0">
                                <p className="max-w-[170px] truncate text-xs font-bold text-[var(--navy)]">{user.firstName} {user.lastName}</p>
                                <p className="max-w-[170px] truncate text-[10px] text-[var(--text-secondary)]">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-xs text-[var(--text-secondary)]">{user.rut}</td>
                          <td className="px-3 py-4"><StatusBadge label={roleLabels[user.role] || user.role} tone={roleTones[user.role]} /></td>
                          <td className="px-3 py-4 text-[10px] text-[var(--text-secondary)]">{new Date(user.createdAt).toLocaleDateString("es-CL")}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  shown={filteredUsers.length}
                  total={data.pagination.total}
                  itemLabel="usuarios"
                  page={data.pagination.page}
                  pages={data.pagination.pages}
                  pageSize={data.pagination.limit}
                  onPageChange={handlePageChange}
                />
              </section>
            </>
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
