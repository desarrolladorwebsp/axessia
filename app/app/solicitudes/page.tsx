"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronDown, FileCheck2, MoreVertical, Plus } from "lucide-react";
import { SkeletonTable } from "../components/Skeletons";
import { ErrorState } from "../components/States";
import PageHeader from "../components/PageHeader";
import MetricCard from "../components/MetricCard";
import { PrimaryButton } from "../components/Buttons";
import StatusBadge, { type StatusTone } from "../components/StatusBadge";
import Avatar from "../components/Avatar";
import { FilterBar, SearchField, FilterSelect } from "../components/FilterBar";
import Pagination from "../components/Pagination";
import CreateRequestModal from "./CreateRequestModal";

interface QuoteRequestItem {
  id: string;
  requestNumber: string | null;
  status: string;
  origin: string;
  price: number | null;
  createdAt: string;
  requesterName?: string | null;
  requesterEmail?: string | null;
  customer: { name: string; email: string; phone: string } | null;
  assignedExecutive: { id: string; firstName: string; lastName: string } | null;
  medications: Array<{ commercialName: string; activeIngredient: string }>;
}

interface PaginationData {
  quotes: QuoteRequestItem[];
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
    dueSoon: number;
    averageAgeDays: number;
  };
  pagination: { total: number; page: number; limit: number; pages: number };
}

const statusLabels: Record<string, string> = { RECEIVED: "Recibida", SOURCING: "En gestión", QUOTED: "Cotizada", AWAITING_DECISION: "Esperando respuesta", ACCEPTED: "Aceptada", SHIPPING: "En despacho", REJECTED: "Rechazada", CANCELLED: "Cancelada", COMPLETED: "Finalizada" };
const statusTones: Record<string, StatusTone> = { RECEIVED: "info", SOURCING: "progress", QUOTED: "accent", AWAITING_DECISION: "accent", ACCEPTED: "success", SHIPPING: "progress", REJECTED: "danger", CANCELLED: "neutral", COMPLETED: "neutral" };
const originLabels: Record<string, string> = { WEB: "Web", EJECUTIVO: "Ejecutivo" };
const originTones: Record<string, StatusTone> = { WEB: "info", EJECUTIVO: "accent" };

export default function SolicitudesPage() {
  const router = useRouter();
  const [data, setData] = useState<PaginationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos");
  const [origin, setOrigin] = useState("Todos");
  const [executive, setExecutive] = useState("Todos");
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchSolicitudes = async () => {
      try {
        setIsLoading(true);
        setError("");
        const params = new URLSearchParams({ page: String(page), limit: "10" });
        if (query.trim()) params.set("q", query.trim());
        if (status !== "Todos") {
          const statusValue = Object.entries(statusLabels).find(([, label]) => label === status)?.[0];
          if (statusValue) params.set("status", statusValue);
        }
        if (origin !== "Todos") {
          const originValue = Object.entries(originLabels).find(([, label]) => label === origin)?.[0];
          if (originValue) params.set("origin", originValue);
        }
        if (executive === "Sin asignar") params.set("executive", "unassigned");
        const response = await fetch(`/api/quote-requests?${params.toString()}`);
        if (!response.ok) throw new Error("Error al cargar solicitudes");
        setData((await response.json()) as PaginationData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSolicitudes();
  }, [page, query, status, origin, executive, refreshKey]);

  const updateQuery = (value: string) => {
    setPage(1);
    setQuery(value);
  };

  const updateStatus = (value: string) => {
    setPage(1);
    setStatus(value);
  };

  const updateOrigin = (value: string) => {
    setPage(1);
    setOrigin(value);
  };

  const updateExecutive = (value: string) => {
    setPage(1);
    setExecutive(value);
  };

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
    dueSoon: 0,
    averageAgeDays: 0,
  };
  const received = summary.totalRequests;
  const inManagement = summary.inManagement;
  const quoted = summary.quoted;
  const dueSoon = summary.dueSoon;
  const averageAgeDays = summary.averageAgeDays;

  return (
    <div className="mx-auto w-full max-w-[1480px] px-1 py-2 sm:px-2 lg:px-4">
      <PageHeader
        icon={FileCheck2}
        eyebrow="Gestión operativa"
        title="Solicitudes recibidas"
        description="Solicitudes recibidas desde la web y en proceso de gestión"
        actions={<PrimaryButton onClick={() => setShowCreateRequest(true)} icon={Plus}>Nueva solicitud</PrimaryButton>}
      />

      {isLoading && <SkeletonTable rows={6} />}
      {error && <ErrorState title="Error al cargar solicitudes" description={error} onRetry={() => setIsLoading(true)} />}

      {!isLoading && data && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <MetricCard label="Total solicitudes" value={String(received)} detail="100% del total" trend="0%" icon={FileCheck2} tone="violet" />
            <MetricCard label="En gestión" value={String(inManagement)} detail={`${received ? Math.round((inManagement / received) * 100) : 0}% del total`} trend="0%" icon={FileCheck2} tone="blue" />
            <MetricCard label="Cotizadas" value={String(quoted)} detail={`${received ? Math.round((quoted / received) * 100) : 0}% del total`} trend="0%" icon={FileCheck2} tone="green" />
            <MetricCard label="Próximas a vencer" value={String(dueSoon)} detail={dueSoon ? "Requiere atención" : "Sin vencimientos"} trend="0%" icon={FileCheck2} tone="yellow" />
            <MetricCard label="Tiempo promedio" value={String(averageAgeDays)} detail="días desde recepción" trend="0%" icon={FileCheck2} tone="neutral" />
          </section>

          <FilterBar>
            <SearchField value={query} onChange={updateQuery} placeholder="Buscar por cliente, ID de solicitud o producto..." label="Buscar solicitudes" />
            <FilterSelect label="Estado" value={status} onChange={updateStatus} options={["Todos", ...Object.values(statusLabels)]} />
            <FilterSelect label="Origen" value={origin} onChange={updateOrigin} options={["Todos", ...Object.values(originLabels)]} />
            <FilterSelect label="Ejecutivo asignado" value={executive} onChange={updateExecutive} options={["Todos", "Sin asignar"]} />
          </FilterBar>

          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[0_10px_30px_rgba(7,30,65,0.05)]">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                    <th className="w-12 px-4 py-3"><input type="checkbox" aria-label="Seleccionar todas" className="accent-[var(--purple)]" /></th>
                    {["ID solicitud", "Cliente", "Producto / Medicamento", "Fecha recepción", "Estado actual", "Origen", "Ejecutivo", "Acciones"].map((header) => (
                      <th key={header} className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--navy)]">
                        {header}<ChevronDown className="ml-1 inline h-3 w-3 text-[var(--text-secondary)]" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.quotes ?? []).map((request, index) => (
                    <RequestRow key={request.id} request={request} index={index} onOpen={() => router.push(`/app/solicitudes/${request.id}`)} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-[var(--border)] md:hidden">
              {(data?.quotes ?? []).map((request, index) => (
                <MobileRequestCard key={request.id} request={request} index={index} onOpen={() => router.push(`/app/solicitudes/${request.id}`)} />
              ))}
            </div>
            {data.quotes.length === 0 && <div className="p-12 text-center text-sm text-[var(--text-secondary)]">No encontramos solicitudes con esos filtros.</div>}
            <Pagination shown={data?.quotes.length ?? 0} total={data.pagination.total} itemLabel="solicitudes" page={data.pagination.page} pages={data.pagination.pages} pageSize={data.pagination.limit} onPageChange={setPage} />
          </section>
        </motion.div>
      )}
      <CreateRequestModal open={showCreateRequest} onClose={() => setShowCreateRequest(false)} onCreated={() => { setPage(1); setRefreshKey((current) => current + 1); }} />
    </div>
  );
}

function RequestRow({ request, index, onOpen }: { request: QuoteRequestItem; index: number; onOpen: () => void }) {
  const name = request.customer?.name || request.requesterName || "Cliente sin nombre";
  const email = request.customer?.email || request.requesterEmail || "Sin correo registrado";
  return (
    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.04 }} onClick={onOpen} className="cursor-pointer border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]">
      <td className="px-4 py-4"><input type="checkbox" aria-label={`Seleccionar ${name}`} onClick={(event) => event.stopPropagation()} className="accent-[var(--purple)]" /></td>
      <td className="px-3 py-4 text-xs font-bold text-[var(--purple)]">{request.requestNumber || "Sin número"}</td>
      <td className="px-3 py-4">
        <div className="flex items-center gap-2">
          <Avatar name={name} />
          <div className="min-w-0">
            <p className="max-w-[150px] truncate text-xs font-bold text-[var(--navy)]">{name}</p>
            <p className="max-w-[150px] truncate text-[10px] text-[var(--text-secondary)]">{email}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-4">
        <p className="text-xs font-bold text-[var(--navy)]">{request.medications[0]?.commercialName || "Sin medicamento"}</p>
        <p className="mt-1 text-[10px] text-[var(--text-secondary)]">{request.medications.length} medicamento{request.medications.length === 1 ? "" : "s"}</p>
      </td>
      <td className="px-3 py-4 text-[10px] text-[var(--text-secondary)]">
        {new Date(request.createdAt).toLocaleDateString("es-CL")}<br />
        {new Date(request.createdAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
      </td>
      <td className="px-3 py-4"><StatusBadge label={statusLabels[request.status] || request.status} tone={statusTones[request.status]} /></td>
      <td className="px-3 py-4"><StatusBadge label={originLabels[request.origin] || request.origin} tone={originTones[request.origin] ?? "neutral"} /></td>
      <td className="px-3 py-4">
        {request.assignedExecutive ? (
          <div className="flex items-center gap-2">
            <Avatar name={`${request.assignedExecutive.firstName} ${request.assignedExecutive.lastName}`} size="sm" />
            <span className="text-[10px] font-semibold text-[var(--text-secondary)]">{request.assignedExecutive.firstName} {request.assignedExecutive.lastName}</span>
          </div>
        ) : <span className="text-[10px] font-semibold text-[var(--text-secondary)]">Sin asignar</span>}
      </td>
      <td className="px-3 py-4">
        <button onClick={(event) => event.stopPropagation()} className="icon-button-small" aria-label={`Acciones para ${name}`} title="Acciones">
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </td>
    </motion.tr>
  );
}

function MobileRequestCard({ request, index, onOpen }: { request: QuoteRequestItem; index: number; onOpen: () => void }) {
  const name = request.customer?.name || request.requesterName || "Cliente sin nombre";
  return (
    <motion.article initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.04 }} onClick={onOpen} className="cursor-pointer p-4 hover:bg-[var(--background)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Avatar name={name} />
          <div>
            <p className="text-xs font-bold text-[var(--navy)]">{name}</p>
            <p className="text-[10px] font-bold text-[var(--purple)]">{request.requestNumber || "Sin número"}</p>
          </div>
        </div>
        <StatusBadge label={statusLabels[request.status] || request.status} tone={statusTones[request.status]} />
      </div>
      <div className="mt-3 flex justify-between text-[10px] text-[var(--text-secondary)]">
        <span>{request.medications[0]?.commercialName || "Sin medicamento"}</span>
        <span>{new Date(request.createdAt).toLocaleDateString("es-CL")}</span>
      </div>
      <div className="mt-2"><StatusBadge label={originLabels[request.origin] || request.origin} tone={originTones[request.origin] ?? "neutral"} /></div>
    </motion.article>
  );
}
