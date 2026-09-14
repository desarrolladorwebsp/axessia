"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  History,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  UserRound,
} from "lucide-react";
import { REQUEST_STATUS_LABELS } from "@/lib/request-status";
import { ErrorState, EmptyState } from "../../components/States";
import StatusBadge, { type StatusTone } from "../../components/StatusBadge";
import Avatar from "../../components/Avatar";
import MetricCard from "../../components/MetricCard";
import { PrimaryButton } from "../../components/Buttons";
import { quoteStatusLabels, quoteStatusTones } from "../../solicitudes/[id]/ViewQuoteModal";
import AddCustomerDocumentModal, { type CustomerDocumentUploadCategory } from "./AddCustomerDocumentModal";

type CustomerStatus = "Activo" | "En proceso" | "Pendiente" | "Finalizado";
type DocumentCategory = "prescription" | "mandate" | "related";
type TabId = "solicitudes" | "cotizaciones" | "documentos" | "actividad";

type CustomerDetailResponse = {
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    rut: string;
    city: string;
    createdAt: string;
    status: CustomerStatus;
  };
  summary: {
    totalRequests: number;
    activeRequests: number;
    finishedRequests: number;
    quotesCount: number;
    lastActivity: string;
  };
  requests: Array<{
    id: string;
    requestNumber: string | null;
    status: string;
    createdAt: string;
    executiveName: string | null;
  }>;
  quotes: Array<{
    id: string;
    quoteNumber: string | null;
    version: number;
    status: string;
    total: string | null;
    createdAt: string;
    requestId: string;
    requestNumber: string | null;
  }>;
  documents: Array<{
    id: string;
    category: DocumentCategory;
    label: string;
    fileName: string;
    mimeType: string;
    fileSize: number | null;
    createdAt: string;
    requestId: string;
    requestNumber: string | null;
    href: string | null;
  }>;
  activity: Array<{
    id: string;
    eventType: string;
    status: string;
    note: string | null;
    createdAt: string;
    requestId: string;
    requestNumber: string | null;
    actorName: string | null;
  }>;
};

const customerStatusTones: Record<CustomerStatus, StatusTone> = {
  Activo: "success",
  "En proceso": "progress",
  Pendiente: "warning",
  Finalizado: "neutral",
};

const requestStatusTones: Record<string, StatusTone> = {
  RECEIVED: "info",
  SOURCING: "progress",
  QUOTED: "accent",
  AWAITING_DECISION: "accent",
  ACCEPTED: "success",
  SHIPPING: "progress",
  REJECTED: "danger",
  CANCELLED: "neutral",
  COMPLETED: "neutral",
};

const eventTypeLabels: Record<string, string> = {
  REQUEST_RECEIVED: "Solicitud recibida",
  EXECUTIVE_ASSIGNED: "Ejecutivo asignado",
  QUOTE_CREATED: "Cotización creada",
  QUOTE_UPDATED: "Cotización actualizada",
  QUOTE_ACCEPTED: "Cotización aceptada",
  QUOTE_REJECTED: "Cotización rechazada",
  QUOTE_EXPIRED: "Cotización vencida",
  MANDATE_GENERATED_AND_SENT: "Mandato generado y enviado",
  SIGNED_MANDATE_ATTACHED: "Mandato firmado adjunto",
  SHIPPING_STARTED: "Despacho iniciado",
  REQUEST_COMPLETED: "Solicitud finalizada",
  REQUEST_REACTIVATED: "Solicitud reactivada",
  REQUEST_REJECTED: "Solicitud rechazada",
  PAYMENT_CONFIRMED: "Pago confirmado",
  PAYMENT_CANCELLED: "Pago cancelado",
  PAYMENT_FAILED: "Pago fallido",
  CUSTOMER_COMMENT: "Comentario del cliente",
};

const documentGroups: Array<{ category: DocumentCategory; title: string; empty: string; action: string }> = [
  { category: "prescription", title: "Recetas", empty: "No hay recetas asociadas a este cliente.", action: "Agregar receta" },
  { category: "mandate", title: "Mandatos", empty: "No hay mandatos asociados a este cliente.", action: "Agregar mandato" },
  { category: "related", title: "Documentos relacionados", empty: "No hay otros documentos asociados.", action: "Agregar documento" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatMoney(value: string | null) {
  if (!value) return "Pendiente";
  return `$${Number(value).toLocaleString("es-CL")}`;
}

function formatFileSize(bytes: number | null) {
  if (bytes == null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function splitStoredName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "—", lastName: "—" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "—" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function eventLabel(eventType: string) {
  return eventTypeLabels[eventType] || eventType.replaceAll("_", " ");
}

function Panel({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[0_10px_28px_rgba(7,30,65,0.04)]">{children}</section>;
}

function Info({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Mail }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
        {Icon ? <Icon className="h-3 w-3" aria-hidden="true" /> : null}
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold text-[var(--navy)]">{value}</dd>
    </div>
  );
}

function SkeletonDetail() {
  return (
    <div className="mx-auto max-w-[1480px] animate-pulse space-y-5 px-1 py-2 sm:px-2 lg:px-4">
      <div className="h-4 w-36 rounded bg-slate-200" />
      <div className="h-24 rounded-2xl bg-white" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-20 rounded-2xl bg-white" />)}
      </div>
      <div className="h-48 rounded-2xl bg-white" />
      <div className="h-72 rounded-2xl bg-white" />
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<CustomerDetailResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("solicitudes");
  const [uploadCategory, setUploadCategory] = useState<CustomerDocumentUploadCategory | null>(null);

  const loadCustomer = useCallback(async (showSkeleton = true) => {
    try {
      if (showSkeleton) setIsLoading(true);
      setError("");
      const response = await fetch(`/api/customers/${params.id}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(response.status === 404 ? "El cliente no existe o fue eliminado." : "No fue posible cargar el cliente.");
      }
      setData((await response.json()) as CustomerDetailResponse);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void loadCustomer();
  }, [loadCustomer]);

  const nameParts = useMemo(() => splitStoredName(data?.customer.name ?? ""), [data?.customer.name]);

  if (isLoading) return <SkeletonDetail />;
  if (error || !data) {
    return (
      <div className="mx-auto max-w-[1480px] px-1 py-2 sm:px-2 lg:px-4">
        <Link href="/app/clientes" className="inline-flex items-center gap-2 text-xs font-bold text-[var(--blue)] transition hover:text-[var(--navy)]">
          <ArrowLeft className="h-4 w-4" />Volver a clientes
        </Link>
        <div className="mt-5">
          <ErrorState title="No fue posible abrir el cliente" description={error || "Cliente no encontrado"} />
        </div>
      </div>
    );
  }

  const { customer, summary, requests, quotes, documents, activity } = data;
  const tabs: Array<{ id: TabId; label: string; count: number }> = [
    { id: "solicitudes", label: "Solicitudes", count: requests.length },
    { id: "cotizaciones", label: "Cotizaciones", count: quotes.length },
    { id: "documentos", label: "Documentos", count: documents.length },
    { id: "actividad", label: "Actividad", count: activity.length },
  ];

  return (
    <div className="mx-auto w-full max-w-[1480px] px-1 py-2 sm:px-2 lg:px-4">
      <Link href="/app/clientes" className="inline-flex items-center gap-2 text-xs font-bold text-[var(--blue)] transition hover:text-[var(--navy)]">
        <ArrowLeft className="h-4 w-4" />Volver a clientes
      </Link>

      <motion.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar name={customer.name} size="lg" />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--purple)]">Ficha de cliente</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-[var(--navy)] sm:text-3xl">{customer.name}</h1>
              <StatusBadge label={customer.status} tone={customerStatusTones[customer.status]} />
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{customer.email}</span>
              <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Registro {formatDate(customer.createdAt)}</span>
            </p>
          </div>
        </div>
      </motion.header>

      <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Solicitudes" value={String(summary.totalRequests)} detail="Total asociadas" trend="" icon={ClipboardList} tone="violet" />
        <MetricCard label="Activas" value={String(summary.activeRequests)} detail="En gestión" trend="" icon={UserRound} tone="blue" />
        <MetricCard label="Finalizadas" value={String(summary.finishedRequests)} detail="Cerradas" trend="" icon={ClipboardList} tone="green" />
        <MetricCard label="Cotizaciones" value={String(summary.quotesCount)} detail="Generadas" trend="" icon={ReceiptText} tone="yellow" />
        <MetricCard label="Última actividad" value={formatDate(summary.lastActivity)} detail={formatDateTime(summary.lastActivity)} trend="" icon={History} tone="neutral" />
      </section>

      <div className="mt-5">
        <Panel>
          <h2 className="font-display text-base font-extrabold text-[var(--navy)]">Datos principales</h2>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Información registrada en la ficha del cliente</p>
          <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Info label="Nombre" value={nameParts.firstName} />
            <Info label="Apellido" value={nameParts.lastName} />
            <Info label="RUT" value={customer.rut} />
            <Info label="Correo" value={customer.email} icon={Mail} />
            <Info label="Teléfono" value={customer.phone} icon={Phone} />
            <Info label="Ciudad" value={customer.city} icon={MapPin} />
            <Info label="Fecha de registro" value={formatDateTime(customer.createdAt)} icon={CalendarDays} />
            <Info label="Estado del cliente" value={customer.status} />
          </dl>
        </Panel>
      </div>

      <div className="mt-5 overflow-x-auto">
        <div role="tablist" aria-label="Secciones de la ficha" className="flex min-w-max gap-2 rounded-2xl border border-[var(--border)] bg-white p-1.5">
          {tabs.map((item) => {
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(item.id)}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition ${selected ? "bg-[var(--navy)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--background)] hover:text-[var(--navy)]"}`}
              >
                {item.label}
                <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${selected ? "bg-white/15 text-white" : "bg-[var(--background)] text-[var(--navy)]"}`}>{item.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        {tab === "solicitudes" && (
          <Panel>
            <h2 className="font-display text-base font-extrabold text-[var(--navy)]">Solicitudes</h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Todas las solicitudes asociadas a este cliente</p>
            {requests.length === 0 ? (
              <EmptyState title="Sin solicitudes" description="Este cliente todavía no tiene solicitudes asociadas." />
            ) : (
              <>
                <div className="mt-5 hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[640px] text-left">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                        {["Número", "Fecha", "Estado actual", "Ejecutivo responsable", ""].map((header) => (
                          <th key={header || "actions"} className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--navy)]">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((request) => (
                        <tr key={request.id} className="border-b border-[var(--border)] last:border-0">
                          <td className="px-3 py-4 text-xs font-bold text-[var(--blue)]">{request.requestNumber || "Sin número"}</td>
                          <td className="px-3 py-4 text-xs text-[var(--text-secondary)]">{formatDateTime(request.createdAt)}</td>
                          <td className="px-3 py-4"><StatusBadge label={REQUEST_STATUS_LABELS[request.status] || request.status} tone={requestStatusTones[request.status]} /></td>
                          <td className="px-3 py-4 text-xs text-[var(--text-secondary)]">{request.executiveName || "Sin asignar"}</td>
                          <td className="px-3 py-4 text-right">
                            <Link href={`/app/solicitudes/${request.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-[var(--blue)] hover:text-[var(--navy)]">
                              Ver detalle <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 divide-y divide-[var(--border)] md:hidden">
                  {requests.map((request) => (
                    <Link key={request.id} href={`/app/solicitudes/${request.id}`} className="block py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-[var(--blue)]">{request.requestNumber || "Sin número"}</p>
                          <p className="mt-1 text-[10px] text-[var(--text-secondary)]">{formatDateTime(request.createdAt)}</p>
                          <p className="mt-1 text-[10px] text-[var(--text-secondary)]">{request.executiveName || "Sin asignar"}</p>
                        </div>
                        <StatusBadge label={REQUEST_STATUS_LABELS[request.status] || request.status} tone={requestStatusTones[request.status]} />
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </Panel>
        )}

        {tab === "cotizaciones" && (
          <Panel>
            <h2 className="font-display text-base font-extrabold text-[var(--navy)]">Cotizaciones</h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Propuestas comerciales vinculadas a sus solicitudes</p>
            {quotes.length === 0 ? (
              <EmptyState title="Sin cotizaciones" description="Todavía no hay cotizaciones asociadas a este cliente." />
            ) : (
              <>
                <div className="mt-5 hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[720px] text-left">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                        {["Cotización", "Solicitud", "Fecha", "Monto", "Estado actual", "Acciones"].map((header) => (
                          <th key={header} className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--navy)]">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {quotes.map((quote) => (
                        <tr key={quote.id} className="border-b border-[var(--border)] last:border-0">
                          <td className="px-3 py-4 text-xs font-bold text-[var(--purple)]">{quote.quoteNumber || `Borrador v${quote.version}`}</td>
                          <td className="px-3 py-4 text-xs text-[var(--text-secondary)]">{quote.requestNumber || "Sin número"}</td>
                          <td className="px-3 py-4 text-xs text-[var(--text-secondary)]">{formatDateTime(quote.createdAt)}</td>
                          <td className="px-3 py-4 text-xs font-bold text-[var(--navy)]">{formatMoney(quote.total)}</td>
                          <td className="px-3 py-4"><StatusBadge label={quoteStatusLabels[quote.status] || quote.status} tone={quoteStatusTones[quote.status]} /></td>
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-2">
                              <Link href={`/app/solicitudes/${quote.requestId}`} className="icon-button-small" aria-label="Ver detalle de la solicitud" title="Ver detalle">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                              <a href={`/api/quotes/${quote.id}/pdf`} target="_blank" rel="noreferrer" className="icon-button-small" aria-label="Descargar cotización en PDF" title="Descargar PDF">
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 divide-y divide-[var(--border)] md:hidden">
                  {quotes.map((quote) => (
                    <article key={quote.id} className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-[var(--purple)]">{quote.quoteNumber || `Borrador v${quote.version}`}</p>
                          <p className="mt-1 text-[10px] text-[var(--text-secondary)]">{quote.requestNumber || "Sin número"} · {formatDate(quote.createdAt)}</p>
                          <p className="mt-1 text-xs font-bold text-[var(--navy)]">{formatMoney(quote.total)}</p>
                        </div>
                        <StatusBadge label={quoteStatusLabels[quote.status] || quote.status} tone={quoteStatusTones[quote.status]} />
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Link href={`/app/solicitudes/${quote.requestId}`} className="text-xs font-bold text-[var(--blue)]">Ver solicitud</Link>
                        <a href={`/api/quotes/${quote.id}/pdf`} target="_blank" rel="noreferrer" className="text-xs font-bold text-[var(--navy)]">Ver PDF</a>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </Panel>
        )}

        {tab === "documentos" && (
          <div className="space-y-4">
            {documentGroups.map((group) => {
              const items = documents.filter((document) => document.category === group.category);
              return (
                <Panel key={group.category}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="font-display text-base font-extrabold text-[var(--navy)]">{group.title}</h2>
                      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{items.length} archivo{items.length === 1 ? "" : "s"}</p>
                    </div>
                    <PrimaryButton
                      size="sm"
                      onClick={() => setUploadCategory(group.category)}
                      disabled={requests.length === 0}
                      title={requests.length === 0 ? "Crea una solicitud antes de asociar documentos" : group.action}
                    >
                      + Agregar
                    </PrimaryButton>
                  </div>
                  {items.length === 0 ? (
                    <p className="mt-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--text-secondary)]">{group.empty}</p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {items.map((document) => (
                        <li key={document.id} className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--purple)]">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-[var(--navy)]">{document.label}</p>
                              <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">{document.fileName}</p>
                              <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
                                {document.requestNumber || "Sin número"} · {formatDateTime(document.createdAt)}
                                {formatFileSize(document.fileSize) ? ` · ${formatFileSize(document.fileSize)}` : ""}
                              </p>
                            </div>
                          </div>
                          {document.href ? (
                            <a href={document.href} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-center text-xs font-bold text-[var(--blue)] transition hover:border-[var(--blue)]">
                              Ver documento
                            </a>
                          ) : (
                            <span className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-center text-xs font-bold text-[var(--text-secondary)] opacity-60">Archivo no disponible</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              );
            })}
          </div>
        )}

        {tab === "actividad" && (
          <Panel>
            <h2 className="font-display text-base font-extrabold text-[var(--navy)]">Historial de actividad</h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Cambios de estado, gestiones y eventos registrados</p>
            {activity.length === 0 ? (
              <EmptyState title="Sin actividad" description="Aún no hay gestiones registradas para este cliente." />
            ) : (
              <ol className="mt-5 space-y-3">
                {activity.map((event) => (
                  <li key={event.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-[var(--navy)]">{eventLabel(event.eventType)}</p>
                        <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
                          {event.requestNumber || "Sin número"}
                          {event.actorName ? ` · ${event.actorName}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <StatusBadge label={REQUEST_STATUS_LABELS[event.status] || event.status} tone={requestStatusTones[event.status]} />
                        <time className="text-[10px] text-[var(--text-secondary)]" dateTime={event.createdAt}>{formatDateTime(event.createdAt)}</time>
                      </div>
                    </div>
                    {event.note ? <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{event.note}</p> : null}
                    <Link href={`/app/solicitudes/${event.requestId}`} className="mt-3 inline-flex text-xs font-bold text-[var(--blue)]">Ver solicitud</Link>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        )}
      </div>

      {uploadCategory ? (
        <AddCustomerDocumentModal
          open
          category={uploadCategory}
          customerId={customer.id}
          requests={requests}
          onClose={() => setUploadCategory(null)}
          onUploaded={() => void loadCustomer(false)}
        />
      ) : null}
    </div>
  );
}
