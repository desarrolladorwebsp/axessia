"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, Check, ClipboardList, Clock3, FileText, History, MessageSquare, ReceiptText, UserRound } from "lucide-react";
import { REQUEST_FLOW_STATUSES, REQUEST_STATUS_LABELS } from "@/lib/request-status";
import RequestStatusInfo from "../../components/RequestStatusInfo";
import { ErrorState } from "../../components/States";
import StatusBadge from "../../components/StatusBadge";
import Avatar from "../../components/Avatar";
import { PrimaryButton, SecondaryButton } from "../../components/Buttons";
import CreateQuoteModal from "./CreateQuoteModal";
import ClientDocumentsCard from "./ClientDocumentsCard";
import PartyDetailsCards from "./PartyDetailsCards";
import ManageStatusModal, { type ManageStatusResult } from "./ManageStatusModal";
import ViewQuoteModal, { quoteStatusLabels, quoteStatusTones, type QuoteDetail } from "./ViewQuoteModal";

type RequestNote = { id: string; executiveName: string; message: string; createdAt: string };
type RequestDetail = { id: string; requestNumber: string | null; status: string; price: number | null; patientName: string | null; patientRut: string | null; createdAt: string; updatedAt?: string; requesterName?: string | null; requesterEmail?: string | null; requesterPhone?: string | null; requesterRut?: string | null; requesterCity?: string | null; customer: { name: string; email: string; phone: string; rut: string; city: string } | null; assignedExecutive: { id: string; firstName: string; lastName: string } | null; prescription: { fileName: string; mimeType: string; fileSize: number; createdAt?: string } | null; clientDocuments: Array<{ id: string; fileName: string; mimeType: string; fileSize: number; createdAt: string }>; generatedMandate: { fileName: string; sentAt: string | null } | null; medications: Array<{ id: string; commercialName: string; activeIngredient: string; concentration: string; tabletQuantity: number }>; internalNotes: RequestNote[]; events: Array<{ id: string; status: string; eventType: string; note?: string | null; createdAt: string }>; quotes: QuoteDetail[] };

const statuses = REQUEST_FLOW_STATUSES;
const statusLabels = REQUEST_STATUS_LABELS;
const statusTones: Record<string, import("../../components/StatusBadge").StatusTone> = { RECEIVED: "info", SOURCING: "progress", QUOTED: "accent", AWAITING_DECISION: "accent", ACCEPTED: "success", SHIPPING: "progress", REJECTED: "danger", CANCELLED: "neutral", COMPLETED: "neutral" };

function SkeletonDetail() { return <div className="mx-auto max-w-[1480px] animate-pulse space-y-6"><div className="h-4 w-36 rounded bg-slate-200" /><div className="flex justify-between border-b border-[var(--border)] pb-6"><div className="space-y-3"><div className="h-3 w-24 rounded bg-slate-200" /><div className="h-9 w-72 rounded bg-slate-200" /><div className="h-3 w-56 rounded bg-slate-200" /></div><div className="h-11 w-48 rounded-xl bg-slate-200" /></div><div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]"><div className="space-y-5"><div className="h-28 rounded-2xl bg-white" /><div className="h-56 rounded-2xl bg-white" /><div className="h-32 rounded-2xl bg-white" /></div><div className="h-72 rounded-2xl bg-white" /></div></div>; }

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <section className={`rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[0_10px_28px_rgba(7,30,65,0.04)] ${className}`}>{children}</section>; }
function SectionHeading({ icon, title, detail }: { icon: React.ReactNode; title: string; detail?: string }) { return <div className="mb-5 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--blue)]/10 text-[var(--blue)]">{icon}</div><div><h2 className="font-display text-base font-extrabold text-[var(--navy)]">{title}</h2>{detail && <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{detail}</p>}</div></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-[var(--navy)]">{value}</dd></div>; }
function SummaryCard({ icon, tone, label, value, detail }: { icon: React.ReactNode; tone: "violet" | "green" | "blue" | "cyan"; label: string; value: string; detail: string }) { const tones = { violet: "bg-violet-50 text-[var(--purple)]", green: "bg-emerald-50 text-emerald-600", blue: "bg-blue-50 text-[var(--blue)]", cyan: "bg-cyan-50 text-[var(--cyan)]" }; return <div className="flex min-w-0 items-center gap-3 rounded-xl border border-[var(--border)] bg-white p-3 shadow-[0_6px_18px_rgba(7,30,65,0.03)]"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tones[tone]}`}>{icon}</div><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">{label}</p><p className="mt-0.5 truncate text-lg font-extrabold leading-tight text-[var(--navy)]">{value}</p><p className="text-[10px] text-[var(--text-secondary)]">{detail}</p></div></div>; }

export default function SolicitudDetailPage() {
  const params = useParams<{ id: string }>();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [editingQuote, setEditingQuote] = useState<QuoteDetail | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<QuoteDetail | null>(null);
  const [showManageStatus, setShowManageStatus] = useState(false);

  const refreshRequest = async () => {
    const response = await fetch(`/api/quote-requests/${params.id}`);
    if (!response.ok) throw new Error(response.status === 404 ? "La solicitud no existe o fue eliminada" : "Error al cargar la solicitud");
    setRequest((await response.json()) as RequestDetail);
  };

  const saveNote = async () => {
    const message = note.trim();
    if (!message || isSavingNote) return;
    try {
      setIsSavingNote(true);
      setNoteError("");
      const response = await fetch(`/api/quote-requests/${params.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      const createdNote = (await response.json()) as RequestNote | { error?: string };
      if (!response.ok || !("id" in createdNote)) throw new Error("error" in createdNote && createdNote.error ? createdNote.error : "No fue posible guardar la nota");
      setRequest((current) => current ? { ...current, internalNotes: [createdNote, ...current.internalNotes] } : current);
      setNote("");
      setShowNote(false);
    } catch (saveError) {
      setNoteError(saveError instanceof Error ? saveError.message : "No fue posible guardar la nota");
    } finally {
      setIsSavingNote(false);
    }
  };

  useEffect(() => { const fetchRequest = async () => { try { setIsLoading(true); setError(""); await refreshRequest(); } catch (fetchError) { setError(fetchError instanceof Error ? fetchError.message : "Error desconocido"); } finally { setIsLoading(false); } }; void fetchRequest(); }, [params.id]);

  const progressIndex = useMemo(() => request ? Math.max(statuses.indexOf(request.status as (typeof statuses)[number]), 0) : 0, [request]);
  if (isLoading) return <SkeletonDetail />;
  if (error || !request) return <div className="mx-auto max-w-[1480px]"><ErrorState title="No fue posible abrir la solicitud" description={error || "Solicitud no encontrada"} /></div>;
  const customerName = request.customer?.name || request.requesterName || "Cliente sin nombre";
  const customerEmail = request.customer?.email || request.requesterEmail || "Sin correo registrado";
  const customerPhone = request.customer?.phone || request.requesterPhone || "No informado";
  const customerRut = request.customer?.rut || request.requesterRut || "No informado";
  const customerCity = request.customer?.city || request.requesterCity || "No informada";
  const canCreateQuote = ["RECEIVED", "SOURCING", "QUOTED", "AWAITING_DECISION"].includes(request.status);

  return <div className="mx-auto w-full max-w-[1480px] px-1 py-2 sm:px-2 lg:px-4"><Link href="/app/solicitudes" className="inline-flex items-center gap-2 text-xs font-bold text-[var(--blue)] transition hover:text-[var(--navy)]"><ArrowLeft className="h-4 w-4" />Volver a solicitudes</Link>
    <motion.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 flex flex-col gap-5 border-b border-[var(--border)] pb-6 xl:flex-row xl:items-start xl:justify-between"><div className="flex items-start gap-3"><div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--purple)] text-[var(--purple)]"><ClipboardList className="h-5 w-5" /></div><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--purple)]">Solicitud</p><div className="mt-1 flex flex-wrap items-center gap-3"><h1 className="font-display text-2xl font-extrabold tracking-tight text-[var(--navy)] sm:text-3xl">{request.requestNumber || "Sin número"}</h1><StatusBadge label={statusLabels[request.status] || request.status} tone={statusTones[request.status]} /></div><p className="mt-2 flex items-center gap-2 text-xs text-[var(--text-secondary)]"><CalendarDays className="h-3.5 w-3.5" />Recibida el {new Date(request.createdAt).toLocaleDateString("es-CL", { dateStyle: "long" })} a las {new Date(request.createdAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</p></div></div><div className="flex flex-wrap gap-2"><SecondaryButton onClick={() => setShowManageStatus(true)} title="Gestionar estado" icon={Clock3}>Gestionar estado</SecondaryButton><PrimaryButton onClick={() => setShowQuoteForm(true)} icon={ReceiptText} disabled={!canCreateQuote}>Crear cotización</PrimaryButton></div></motion.header>

    <CreateQuoteModal
      open={showQuoteForm}
      onClose={() => { setShowQuoteForm(false); setEditingQuote(null); }}
      requestId={request.id}
      customerName={customerName}
      medications={request.medications}
      editingQuote={editingQuote}
      onCreated={(quote) => {
        const isFinal = quote.status !== "DRAFT";
        setRequest((current) => {
          if (!current) return current;
          const exists = current.quotes.some((existing) => existing.id === quote.id);
          const quotes = exists ? current.quotes.map((existing) => (existing.id === quote.id ? quote : existing)) : [quote, ...current.quotes];
          return { ...current, status: isFinal ? "QUOTED" : current.status, price: isFinal ? Number(quote.total ?? 0) : current.price, quotes };
        });
        setShowQuoteForm(false);
        setEditingQuote(null);
        void refreshRequest().catch((refreshError) => setError(refreshError instanceof Error ? refreshError.message : "No fue posible actualizar la solicitud"));
      }}
    />
    <ViewQuoteModal
      open={Boolean(selectedQuote)}
      onClose={() => setSelectedQuote(null)}
      quote={selectedQuote}
      customerName={customerName}
      onEdit={(quote) => {
        setSelectedQuote(null);
        setEditingQuote(quote);
        setShowQuoteForm(true);
      }}
      onSent={(quote) => {
        setRequest((current) => (current ? { ...current, status: "AWAITING_DECISION", updatedAt: new Date().toISOString(), quotes: current.quotes.map((existing) => (existing.id === quote.id ? quote : existing)) } : current));
        setSelectedQuote(quote);
        void refreshRequest().catch((refreshError) => setError(refreshError instanceof Error ? refreshError.message : "No fue posible actualizar la solicitud"));
      }}
    />
    <ManageStatusModal
      open={showManageStatus}
      onClose={() => setShowManageStatus(false)}
      requestId={request.id}
      currentStatus={request.status}
      onUpdated={(result: ManageStatusResult) => {
        setRequest((current) => current ? { ...current, status: result.status, updatedAt: result.updatedAt || new Date().toISOString(), assignedExecutive: result.assignedExecutive ?? current.assignedExecutive, generatedMandate: result.generatedMandate ?? current.generatedMandate } : current);
        void refreshRequest().catch((refreshError) => setError(refreshError instanceof Error ? refreshError.message : "No fue posible actualizar la solicitud"));
      }}
    />
    <section className="mt-5 border-y border-[var(--border)] py-4"><div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Progreso de la solicitud</p><RequestStatusInfo /></div><span className="text-[10px] font-semibold text-[var(--purple)]">{statusLabels[request.status] || request.status}</span></div><div className="overflow-x-auto pb-1"><div className="flex min-w-[620px] items-start">{statuses.map((status, index) => { const complete = index < progressIndex; const current = index === progressIndex && request.status !== "REJECTED" && request.status !== "CANCELLED"; return <div key={status} className="relative flex flex-1 flex-col items-center text-center"><div className="flex w-full items-center"><div className={`h-0.5 flex-1 ${index === 0 ? "bg-transparent" : index <= progressIndex ? "bg-[var(--blue)]" : "bg-[var(--border)]"}`} /><div className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold ${current ? "border-[var(--purple)] bg-[var(--purple)] text-white shadow-[0_0_0_4px_rgba(122,40,216,0.1)]" : complete ? "border-[var(--blue)] bg-[var(--blue)] text-white" : "border-[var(--border)] bg-white text-[var(--text-secondary)]"}`}>{complete ? <Check className="h-3.5 w-3.5" /> : index + 1}</div><div className={`h-0.5 flex-1 ${index === statuses.length - 1 ? "bg-transparent" : index < progressIndex ? "bg-[var(--blue)]" : "bg-[var(--border)]"}`} /></div><p className={`mt-2 px-1 text-[10px] font-bold ${current ? "text-[var(--purple)]" : complete ? "text-[var(--blue)]" : "text-[var(--text-secondary)]"}`}>{statusLabels[status]}</p></div>; })}</div></div></section>

    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)]"><main className="space-y-5"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"><SummaryCard icon={<ClipboardList className="h-4 w-4" />} tone="violet" label="Medicamentos" value={String(request.medications.length)} detail="solicitados" /><SummaryCard icon={<FileText className="h-4 w-4" />} tone="green" label="Receta" value={request.prescription ? "Sí" : "No"} detail="archivo registrado" /><SummaryCard icon={<UserRound className="h-4 w-4" />} tone="blue" label="Paciente" value={request.patientName || "No informado"} detail="datos disponibles" /><SummaryCard icon={<ReceiptText className="h-4 w-4" />} tone="cyan" label="Precio" value={request.price ? `$${Number(request.price).toLocaleString("es-CL")}` : "-"} detail="cotización" /></div>

      <Panel><SectionHeading icon={<ClipboardList className="h-4 w-4" />} title="Medicamentos solicitados" detail={`${request.medications.length} medicamento${request.medications.length === 1 ? "" : "s"} en esta solicitud`} /><div className="overflow-x-auto"><table className="w-full min-w-[540px] text-left"><thead><tr className="border-b border-[var(--border)] bg-[var(--background)]"><th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Medicamento</th><th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Principio activo</th><th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Concentración</th><th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Comprimidos por caja</th></tr></thead><tbody>{request.medications.map((medication) => <tr key={medication.id} className="border-b border-[var(--border)] last:border-0"><td className="px-4 py-4 text-sm font-bold text-[var(--navy)]">{medication.commercialName}</td><td className="px-4 py-4 text-xs text-[var(--text-secondary)]">{medication.activeIngredient}</td><td className="px-4 py-4 text-xs text-[var(--text-secondary)]">{medication.concentration}</td><td className="px-4 py-4 text-right text-sm font-bold text-[var(--navy)]">{medication.tabletQuantity}</td></tr>)}</tbody></table></div></Panel>
      <Panel><SectionHeading icon={<ReceiptText className="h-4 w-4" />} title="Cotizaciones" detail={request.quotes.length ? `${request.quotes.length} cotización${request.quotes.length === 1 ? "" : "es"} generada${request.quotes.length === 1 ? "" : "s"}` : "Sin cotizaciones aún"} />{request.quotes.length ? <div className="space-y-3">{request.quotes.map((quote) => <button key={quote.id} type="button" onClick={() => setSelectedQuote(quote)} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-left transition hover:border-[var(--blue)] hover:bg-white"><div className="min-w-0"><p className="text-sm font-extrabold text-[var(--navy)]">{quote.quoteNumber || `Borrador v${quote.version}`}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{quote.items.length} producto{quote.items.length === 1 ? "" : "s"} · Emitida el {new Date(quote.createdAt).toLocaleDateString("es-CL")}</p></div><div className="flex items-center gap-3"><StatusBadge label={quoteStatusLabels[quote.status] || quote.status} tone={quoteStatusTones[quote.status]} /><p className="text-sm font-extrabold text-[var(--navy)]">{quote.total ? `$${Number(quote.total).toLocaleString("es-CL")}` : "Pendiente"}</p></div></button>)}</div> : <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--text-secondary)]">Aún no se han generado cotizaciones para esta solicitud.</div>}</Panel>
      <Panel><SectionHeading icon={<FileText className="h-4 w-4" />} title="Receta médica" detail="Documento adjunto a la solicitud" />{request.prescription ? <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[var(--purple)]"><FileText className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate text-sm font-bold text-[var(--navy)]">{request.prescription.fileName}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{request.prescription.mimeType} · {(request.prescription.fileSize / 1024).toFixed(1)} KB</p></div></div><button type="button" disabled title="Visor próximamente" className="cursor-not-allowed rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-bold text-[var(--text-secondary)] opacity-60">Ver receta</button></div> : <p className="rounded-xl bg-[var(--background)] p-4 text-sm text-[var(--text-secondary)]">No se adjuntó una receta médica.</p>}</Panel>
      <ClientDocumentsCard requestId={request.id} initialDocuments={request.clientDocuments ?? []} generatedMandate={request.generatedMandate ?? null} />
      <Panel><SectionHeading icon={<History className="h-4 w-4" />} title="Historial de actividad" detail="Trazabilidad de cambios y gestiones registradas" />{request.events.length ? <div className="space-y-3">{request.events.map((event) => <article key={event.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold text-[var(--navy)]">{event.eventType.replaceAll("_", " ")}</p><time className="text-[10px] text-[var(--text-secondary)]" dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString("es-CL")}</time></div>{event.note && <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{event.note}</p>}</article>)}</div> : <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-secondary)]">Aún no hay gestiones registradas.</div>}</Panel>
      <Panel><div className="flex items-center justify-between"><SectionHeading icon={<MessageSquare className="h-4 w-4" />} title="Notas internas" detail="Visibles sólo para el equipo AXESSIA" /><button type="button" onClick={() => { setShowNote(!showNote); setNoteError(""); }} className="rounded-lg border border-[var(--purple)] px-3 py-2 text-xs font-bold text-[var(--purple)] transition hover:bg-violet-50">{showNote ? "Cancelar" : "Agregar nota"}</button></div>{showNote && <div className="mb-4 space-y-2"><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Escribe una nota interna..." rows={3} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm outline-none focus:border-[var(--blue)]" /><button type="button" onClick={saveNote} disabled={!note.trim() || isSavingNote} className="rounded-lg bg-[var(--navy)] px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{isSavingNote ? "Guardando..." : "Guardar nota"}</button>{noteError && <p className="text-xs font-semibold text-rose-600">{noteError}</p>}</div>}{request.internalNotes.length ? <div className="space-y-3">{request.internalNotes.map((internalNote) => <article key={internalNote.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold text-[var(--navy)]">{internalNote.executiveName}</p><time className="text-[10px] text-[var(--text-secondary)]" dateTime={internalNote.createdAt}>{new Date(internalNote.createdAt).toLocaleDateString("es-CL")}</time></div><p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{internalNote.message}</p></article>)}</div> : <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-secondary)]">Aún no hay notas internas registradas.</div>}</Panel>
    </main><PartyDetailsCards requestId={request.id} customer={{ name: customerName, email: customerEmail, phone: customerPhone, rut: customerRut, city: customerCity }} patient={{ name: request.patientName || "", rut: request.patientRut || "" }} onUpdated={(values) => setRequest((current) => !current ? current : { ...current, requesterName: values.customer?.name ?? current.requesterName, requesterEmail: values.customer?.email ?? current.requesterEmail, requesterPhone: values.customer?.phone ?? current.requesterPhone, requesterRut: values.customer?.rut ?? current.requesterRut, requesterCity: values.customer?.city ?? current.requesterCity, patientName: values.patient?.name ?? current.patientName, patientRut: values.patient?.rut ?? current.patientRut, customer: current.customer && values.customer ? { ...current.customer, ...values.customer } : current.customer })} /></div>
  </div>;
}
