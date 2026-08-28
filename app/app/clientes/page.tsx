"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, ChevronDown, UserRound, UsersRound } from "lucide-react";
import PageHeader from "../components/PageHeader";
import MetricCard from "../components/MetricCard";
import { PrimaryButton } from "../components/Buttons";
import StatusBadge, { type StatusTone } from "../components/StatusBadge";
import Avatar from "../components/Avatar";
import { FilterBar, SearchField, FilterSelect, FilterButton } from "../components/FilterBar";
import Pagination from "../components/Pagination";
import { SlidersHorizontal, Plus } from "lucide-react";

const clients = [
  { initials: "MV", name: "María Valentina Rojas", email: "maria.rojas@email.com", city: "Santiago", origin: "Web", status: "Activo", lastActivity: "Hoy, 10:42" },
  { initials: "JC", name: "Juan Carlos Muñoz", email: "juan.munoz@email.com", city: "Las Condes", origin: "Referido", status: "En proceso", lastActivity: "Ayer, 16:18" },
  { initials: "PA", name: "Patricia Andrea Silva", email: "patricia.silva@email.com", city: "Providencia", origin: "Web", status: "Pendiente", lastActivity: "12 ago, 09:30" },
  { initials: "FG", name: "Felipe González", email: "felipe.gonzalez@email.com", city: "Ñuñoa", origin: "WhatsApp", status: "Activo", lastActivity: "11 ago, 14:05" },
  { initials: "CS", name: "Carolina Soto", email: "carolina.soto@email.com", city: "Viña del Mar", origin: "Web", status: "Finalizado", lastActivity: "09 ago, 11:26" },
];

const statusTones: Record<string, StatusTone> = {
  Activo: "success",
  "En proceso": "progress",
  Pendiente: "warning",
  Finalizado: "neutral",
};

export default function ClientsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos los estados");

  const filteredClients = useMemo(
    () =>
      clients.filter((client) => {
        const matchesQuery = `${client.name} ${client.email} ${client.city}`.toLowerCase().includes(query.toLowerCase());
        const matchesStatus = status === "Todos los estados" || client.status === status;
        return matchesQuery && matchesStatus;
      }),
    [query, status],
  );

  return (
    <div className="mx-auto w-full max-w-[1480px] px-1 py-2 sm:px-2 lg:px-4">
      <PageHeader
        icon={UserRound}
        eyebrow="Gestión comercial"
        title="Clientes"
        description="Gestión de clientes y su estado en el proceso"
        actions={<PrimaryButton icon={Plus} size="sm">Nuevo cliente</PrimaryButton>}
      />

      <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard label="Total de clientes" value="248" detail="Base registrada" trend="+12.5%" icon={UsersRound} tone="violet" />
        <MetricCard label="Clientes activos" value="186" detail="75% del total" trend="+8.2%" icon={Activity} tone="green" />
        <MetricCard label="En proceso" value="42" detail="Requieren seguimiento" trend="+4.8%" icon={UserRound} tone="blue" />
        <MetricCard label="Pendientes" value="20" detail="Sin actividad reciente" trend="-2.1%" icon={Activity} tone="yellow" />
      </section>

      <FilterBar>
        <SearchField value={query} onChange={setQuery} placeholder="Buscar por nombre o correo" label="Buscar clientes" />
        <FilterSelect label="Estado" value={status} onChange={setStatus} options={["Todos los estados", "Activo", "En proceso", "Pendiente", "Finalizado"]} />
        <FilterButton><SlidersHorizontal className="h-3.5 w-3.5" />Filtros</FilterButton>
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
                {["Cliente", "Ciudad", "Origen", "Estado actual", "Última actividad"].map((header) => (
                  <th key={header} className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--navy)]">{header}</th>
                ))}
                <th className="w-14 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client, index) => (
                <motion.tr key={client.email} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.04 }} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]">
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
                  <td className="px-3 py-4 text-xs text-[var(--text-secondary)]">{client.origin}</td>
                  <td className="px-3 py-4"><StatusBadge label={client.status} tone={statusTones[client.status]} /></td>
                  <td className="px-3 py-4 text-[10px] text-[var(--text-secondary)]">{client.lastActivity}</td>
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
          {filteredClients.map((client) => (
            <article key={client.email} className="p-4">
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
                <span>{client.city} · {client.origin}</span>
                <span>{client.lastActivity}</span>
              </div>
            </article>
          ))}
        </div>

        {filteredClients.length === 0 && <div className="p-12 text-center text-sm text-[var(--text-secondary)]">No encontramos clientes con esos filtros.</div>}

        <Pagination shown={filteredClients.length} total={248} itemLabel="clientes" page={1} pages={3} />
      </section>
    </div>
  );
}
