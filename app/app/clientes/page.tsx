"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, ChevronDown, UserRound, UsersRound } from "lucide-react";
import PageHeader from "../components/PageHeader";
import MetricCard from "../components/MetricCard";
import { PrimaryButton } from "../components/Buttons";
import StatusBadge, { type StatusTone } from "../components/StatusBadge";
import Avatar from "../components/Avatar";
import { FilterBar, SearchField, FilterSelect } from "../components/FilterBar";
import Pagination from "../components/Pagination";
import { Plus } from "lucide-react";
import CreateCustomerModal from "./CreateCustomerModal";

type CustomerRecord = {
  id: string;
  name: string;
  email: string;
  city: string;
  status: "Activo" | "En proceso" | "Pendiente" | "Finalizado";
  lastActivity: string;
  createdAt: string;
  hasPendingRequest: boolean;
};

type CustomersResponse = {
  customers: CustomerRecord[];
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    inProcessCustomers: number;
    pendingCustomers: number;
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

const statusTones: Record<string, StatusTone> = {
  Activo: "success",
  "En proceso": "progress",
  Pendiente: "warning",
  Finalizado: "neutral",
};

export default function ClientsPage() {
  const [data, setData] = useState<CustomersResponse | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos los estados");
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const params = new URLSearchParams({ page: String(page), limit: "10" });
        if (query.trim()) params.set("q", query.trim());
        if (status !== "Todos los estados") params.set("status", status);

        const response = await fetch(`/api/customers?${params.toString()}`);
        if (!response.ok) {
          throw new Error("No fue posible cargar los clientes");
        }
        const result = (await response.json()) as CustomersResponse;
        setData(result);
      } catch (error) {
        console.error("Error fetching customers:", error);
      }
    };

    fetchClients();
  }, [page, query, status, refreshKey]);

  const summary = data?.summary ?? {
    totalCustomers: 0,
    activeCustomers: 0,
    inProcessCustomers: 0,
    pendingCustomers: 0,
  };

  const clients = data?.customers ?? [];

  const updateQuery = (value: string) => {
    setPage(1);
    setQuery(value);
  };

  const updateStatus = (value: string) => {
    setPage(1);
    setStatus(value);
  };

  return (
    <div className="mx-auto w-full max-w-[1480px] px-1 py-2 sm:px-2 lg:px-4">
      <PageHeader
        icon={UserRound}
        eyebrow="Gestión comercial"
        title="Clientes"
        description="Gestión de clientes y su estado en el proceso"
        actions={<PrimaryButton onClick={() => setShowCreateCustomer(true)} icon={Plus} size="sm">Nuevo cliente</PrimaryButton>}
      />

      <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard label="Total de clientes" value={String(summary.totalCustomers)} detail="Base registrada" trend="0%" icon={UsersRound} tone="violet" />
        <MetricCard label="Clientes activos" value={String(summary.activeCustomers)} detail="Clientes con actividad" trend="0%" icon={Activity} tone="green" />
        <MetricCard label="En proceso" value={String(summary.inProcessCustomers)} detail="Requieren seguimiento" trend="0%" icon={UserRound} tone="blue" />
        <MetricCard label="Pendientes" value={String(summary.pendingCustomers)} detail="Sin actividad reciente" trend="0%" icon={Activity} tone="yellow" />
      </section>

      <FilterBar>
        <SearchField value={query} onChange={updateQuery} placeholder="Buscar por nombre o correo" label="Buscar clientes" />
        <FilterSelect label="Estado" value={status} onChange={updateStatus} options={["Todos los estados", "Activo", "En proceso", "Pendiente", "Finalizado"]} />
      </FilterBar>

      <section className="mt-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[0_10px_30px_rgba(7,30,65,0.05)]">
        <div className="border-b border-[var(--border)] p-5">
          <h2 className="font-display text-lg font-extrabold text-[var(--navy)]">Directorio de clientes</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Consulta y seguimiento de tu cartera</p>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                <th className="w-12 px-5 py-3"><input type="checkbox" aria-label="Seleccionar todos" className="accent-[var(--purple)]" /></th>
                {["Cliente", "Ciudad", "Estado actual", "Última actividad"].map((header) => (
                  <th key={header} className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--navy)]">{header}</th>
                ))}
                <th className="w-14 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {clients.map((client, index) => (
                <motion.tr key={client.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.04 }} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]">
                  <td className="px-5 py-4"><input type="checkbox" aria-label={`Seleccionar a ${client.name}`} className="accent-[var(--purple)]" /></td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={client.name} />
                      <div className="min-w-0">
                        <p className="max-w-[170px] truncate text-xs font-bold text-[var(--navy)]">{client.name}</p>
                        <p className="max-w-[170px] truncate text-[10px] text-[var(--text-secondary)]">{client.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-xs text-[var(--text-secondary)]">{client.city}</td>
                  <td className="px-3 py-4"><StatusBadge label={client.status} tone={statusTones[client.status]} /></td>
                  <td className="px-3 py-4 text-[10px] text-[var(--text-secondary)]">{new Date(client.lastActivity).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-3 py-4">
                    <button className="icon-button-small" aria-label={`Acciones para ${client.name}`} title="Acciones">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-[var(--border)] md:hidden">
          {clients.map((client) => (
            <article key={client.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={client.name} />
                  <div>
                    <p className="text-xs font-bold text-[var(--navy)]">{client.name}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">{client.email}</p>
                  </div>
                </div>
                <StatusBadge label={client.status} tone={statusTones[client.status]} />
              </div>
              <div className="mt-3 flex justify-between text-[10px] text-[var(--text-secondary)]">
                <span>{client.city}</span>
                <span>{new Date(client.lastActivity).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
              </div>
            </article>
          ))}
        </div>

        {clients.length === 0 && <div className="p-12 text-center text-sm text-[var(--text-secondary)]">No encontramos clientes con esos filtros.</div>}

        <Pagination
          shown={clients.length}
          total={data?.pagination.total ?? 0}
          itemLabel="clientes"
          page={data?.pagination.page ?? 1}
          pages={data?.pagination.pages ?? 1}
          onPageChange={setPage}
        />
      </section>
      <CreateCustomerModal open={showCreateCustomer} onClose={() => setShowCreateCustomer(false)} onCreated={() => { setPage(1); setRefreshKey((current) => current + 1); }} />
    </div>
  );
}
