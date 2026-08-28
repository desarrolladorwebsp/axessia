"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronDown, FileText, MoreVertical, Plus } from "lucide-react";
import { SkeletonTable } from "../components/Skeletons";
import { EmptyState, ErrorState } from "../components/States";
import PageHeader from "../components/PageHeader";
import MetricCard from "../components/MetricCard";
import { PrimaryButton } from "../components/Buttons";
import StatusBadge, { type StatusTone } from "../components/StatusBadge";
import Avatar from "../components/Avatar";
import { FilterBar, SearchField, FilterSelect, FilterButton } from "../components/FilterBar";
import Pagination from "../components/Pagination";

type QuoteStatus = "DRAFT" | "READY" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "VOIDED";
type Quote = { id: string; quoteNumber: string | null; version: number; status: QuoteStatus; total: string | null; validUntil: string | null; createdAt: string; sentAt: string | null; request: { id: string; requestNumber: string | null; requesterName: string; requesterEmail: string; customer: { name: string; email: string } | null }; items: Array<{ productName: string; quantity: number }> };
type QuotesResponse = { quotes: Quote[]; pagination: { total: number; page: number; limit: number; pages: number } };

const statusLabels: Record<QuoteStatus, string> = { DRAFT: "Borrador", READY: "Lista para enviar", SENT: "Enviada", ACCEPTED: "Aceptada", REJECTED: "Rechazada", EXPIRED: "Vencida", VOIDED: "Anulada" };
const statusTones: Record<QuoteStatus, StatusTone> = { DRAFT: "neutral", READY: "warning", SENT: "info", ACCEPTED: "success", REJECTED: "danger", EXPIRED: "warning", VOIDED: "neutral" };

export default function QuotesPage() {
  const router = useRouter();
  const [data, setData] = useState<QuotesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos");

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await fetch("/api/quotes?page=1&limit=10");
        if (!response.ok) throw new Error("Error al cargar cotizaciones");
        setData((await response.json()) as QuotesResponse);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Error desconocido");
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuotes();
  }, []);

  const filteredQuotes = useMemo(
    () =>
      data?.quotes.filter((quote) => {
        const name = quote.request.customer?.name || quote.request.requesterName;
        const email = quote.request.customer?.email || quote.request.requesterEmail;
        return (
          `${name} ${email} ${quote.quoteNumber || ""} ${quote.request.requestNumber || ""}`.toLowerCase().includes(query.toLowerCase()) &&
          (status === "Todos" || statusLabels[quote.status] === status)
        );
      }) ?? [],
    [data, query, status],
  );

  const total = data?.pagination.total ?? 0;
  const sent = data?.quotes.filter((quote) => quote.status === "SENT").length ?? 0;
  const accepted = data?.quotes.filter((quote) => quote.status === "ACCEPTED").length ?? 0;
  const pending = data?.quotes.filter((quote) => ["DRAFT", "READY"].includes(quote.status)).length ?? 0;

  return (
    <div className="mx-auto w-full max-w-[1480px] px-1 py-2 sm:px-2 lg:px-4">
      <PageHeader
        icon={FileText}
        eyebrow="Gestión comercial"
        title="Cotizaciones"
        description="Propuestas comerciales vinculadas a solicitudes"
        actions={<PrimaryButton href="/app/solicitudes" icon={Plus}>Nueva cotización</PrimaryButton>}
      />

      {isLoading && <SkeletonTable rows={6} />}
      {error && <ErrorState title="Error al cargar cotizaciones" description={error} onRetry={() => setIsLoading(true)} />}

      {!isLoading && data && (filteredQuotes.length === 0 ? (
        <EmptyState title="No hay cotizaciones" description="No encontramos cotizaciones con esos filtros." />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <MetricCard label="Total cotizaciones" value={String(total)} detail="Registros generados" trend="+9%" icon={FileText} tone="violet" />
            <MetricCard label="Enviadas" value={String(sent)} detail="En la página actual" trend="+6%" icon={FileText} tone="blue" />
            <MetricCard label="Aceptadas" value={String(accepted)} detail="En la página actual" trend="+11%" icon={FileText} tone="green" />
            <MetricCard label="Pendientes" value={String(pending)} detail="Borradores y listas" trend="▲" icon={FileText} tone="yellow" />
            <MetricCard label="Versiones" value={String(data.quotes.reduce((sum, quote) => sum + quote.version, 0))} detail="En la página actual" trend="●" icon={FileText} tone="neutral" />
          </section>

          <FilterBar>
            <SearchField value={query} onChange={setQuery} placeholder="Buscar por cliente, número de cotización o solicitud..." label="Buscar cotizaciones" />
            <FilterSelect label="Estado" value={status} onChange={setStatus} options={["Todos", ...Object.values(statusLabels)]} />
            <FilterButton>Filtros avanzados</FilterButton>
          </FilterBar>

          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[0_10px_30px_rgba(7,30,65,0.05)]">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[960px] text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                    <th className="w-12 px-4 py-3"><input type="checkbox" aria-label="Seleccionar todas" className="accent-[var(--purple)]" /></th>
                    {["Cotización", "Cliente", "Solicitud", "Fecha emisión", "Estado actual", "Total", "Acciones"].map((header) => (
                      <th key={header} className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--navy)]">
                        {header}<ChevronDown className="ml-1 inline h-3 w-3 text-[var(--text-secondary)]" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotes.map((quote, index) => (
                    <QuoteRow key={quote.id} quote={quote} index={index} onOpen={() => router.push(`/app/solicitudes/${quote.request.id}`)} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-[var(--border)] md:hidden">
              {filteredQuotes.map((quote, index) => (
                <MobileQuoteCard key={quote.id} quote={quote} index={index} onOpen={() => router.push(`/app/solicitudes/${quote.request.id}`)} />
              ))}
            </div>
            <Pagination shown={filteredQuotes.length} total={total} itemLabel="cotizaciones" page={data.pagination.page} pages={data.pagination.pages} pageSize={data.pagination.limit} />
          </section>
        </motion.div>
      ))}
    </div>
  );
}

function QuoteRow({ quote, index, onOpen }: { quote: Quote; index: number; onOpen: () => void }) {
  const name = quote.request.customer?.name || quote.request.requesterName;
  const email = quote.request.customer?.email || quote.request.requesterEmail;
  return (
    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.04 }} onClick={onOpen} className="cursor-pointer border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]">
      <td className="px-4 py-4"><input type="checkbox" aria-label={`Seleccionar ${name}`} onClick={(event) => event.stopPropagation()} className="accent-[var(--purple)]" /></td>
      <td className="px-3 py-4 text-xs font-bold text-[var(--purple)]">{quote.quoteNumber || `Borrador v${quote.version}`}</td>
      <td className="px-3 py-4">
        <div className="flex items-center gap-2">
          <Avatar name={name} />
          <div className="min-w-0">
            <p className="max-w-[160px] truncate text-xs font-bold text-[var(--navy)]">{name}</p>
            <p className="max-w-[160px] truncate text-[10px] text-[var(--text-secondary)]">{email}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-4">
        <p className="text-xs font-bold text-[var(--navy)]">{quote.request.requestNumber || "Sin solicitud"}</p>
        <p className="mt-1 text-[10px] text-[var(--text-secondary)]">{quote.items.length} ítem{quote.items.length === 1 ? "" : "s"}</p>
      </td>
      <td className="px-3 py-4 text-[10px] text-[var(--text-secondary)]">
        {new Date(quote.createdAt).toLocaleDateString("es-CL")}<br />
        {new Date(quote.createdAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
      </td>
      <td className="px-3 py-4"><StatusBadge label={statusLabels[quote.status]} tone={statusTones[quote.status]} /></td>
      <td className="px-3 py-4 text-xs font-bold text-[var(--navy)]">{quote.total ? `$${Number(quote.total).toLocaleString("es-CL")}` : "Pendiente"}</td>
      <td className="px-3 py-4">
        <button onClick={(event) => event.stopPropagation()} className="icon-button-small" aria-label={`Acciones para ${name}`} title="Acciones">
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </td>
    </motion.tr>
  );
}

function MobileQuoteCard({ quote, index, onOpen }: { quote: Quote; index: number; onOpen: () => void }) {
  const name = quote.request.customer?.name || quote.request.requesterName;
  return (
    <motion.article initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.04 }} onClick={onOpen} className="cursor-pointer p-4 hover:bg-[var(--background)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Avatar name={name} />
          <div>
            <p className="text-xs font-bold text-[var(--navy)]">{name}</p>
            <p className="text-[10px] font-bold text-[var(--purple)]">{quote.quoteNumber || `Borrador v${quote.version}`}</p>
          </div>
        </div>
        <StatusBadge label={statusLabels[quote.status]} tone={statusTones[quote.status]} />
      </div>
      <div className="mt-3 flex justify-between text-[10px] text-[var(--text-secondary)]">
        <span>{quote.request.requestNumber || "Sin solicitud"}</span>
        <span>{quote.total ? `$${Number(quote.total).toLocaleString("es-CL")}` : "Pendiente"}</span>
      </div>
    </motion.article>
  );
}
