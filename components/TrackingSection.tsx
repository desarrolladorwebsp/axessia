"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, LockKeyhole, Search } from "lucide-react";

const stages = [
  ["01", "Recibida", "Tu solicitud fue recibida."],
  ["02", "En gestión", "Gestionamos alternativas disponibles."],
  ["03", "Cotizada", "La cotización está lista para enviar."],
  ["04", "Esperando respuesta", "Te avisaremos cuando la cotización sea enviada."],
];
const labels: Record<string, string> = { RECEIVED: "Recibida", SOURCING: "En gestión", QUOTED: "Cotizada", AWAITING_DECISION: "Esperando respuesta", ACCEPTED: "Aceptada", SHIPPING: "En despacho", REJECTED: "Rechazada", CANCELLED: "Cancelada", COMPLETED: "Finalizada" };
type Summary = { requestNumber: string; status: string; createdAt: string; updatedAt: string; medications: Array<{ commercialName: string; concentration: string; tabletQuantity: number }>; hasQuote: boolean };
const date = (value: string) => new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function TrackingSection() {
  const [requestNumber, setRequestNumber] = useState("");
  const [rut, setRut] = useState("");
  const [needsRut, setNeedsRut] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(""); setSummary(null);
    if (!requestNumber.trim()) return setError("Ingresa tu número de solicitud.");
    if (!needsRut) return setNeedsRut(true);
    if (!rut.trim()) return setError("Ingresa el RUT asociado a la solicitud.");
    setLoading(true);
    try {
      const verify = await fetch("/api/tracking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestNumber, rut }) });
      if (!verify.ok) throw new Error("No pudimos validar esos datos. Revisa tu número de solicitud y RUT.");
      const { token } = await verify.json() as { token: string };
      const detail = await fetch(`/api/tracking/detail?token=${encodeURIComponent(token)}`);
      if (!detail.ok) throw new Error("No fue posible cargar el seguimiento.");
      setSummary(await detail.json() as Summary);
      sessionStorage.setItem(`axessia-tracking-${requestNumber.toUpperCase()}`, token);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible consultar la solicitud."); }
    finally { setLoading(false); }
  };

  return <section className="tracking-section" id="seguimiento" aria-labelledby="tracking-title">
    <div className="tracking-hero"><motion.div className="tracking-copy" initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }}>
      <p className="eyebrow">Seguimiento inteligente</p><h2 id="tracking-title">Tu solicitud,<br /><span className="gradient-text">siempre a la vista.</span></h2><p className="tracking-subtitle">Consulta su estado con tu ID.</p><div className="tracking-rule brand-gradient" /><p className="tracking-description">Ingresa tu ID AXESSIA. Para proteger tu información, también necesitaremos el RUT asociado.</p>
      <form className="tracking-form" onSubmit={submit} noValidate><label htmlFor="tracking-id">Número de solicitud AXESSIA</label><div className="tracking-input-row"><input id="tracking-id" value={requestNumber} onChange={(event) => { setRequestNumber(event.target.value); setNeedsRut(false); setSummary(null); setError(""); }} placeholder="Ej: S-100001" autoComplete="off" />{!needsRut && <button type="submit"><Search size={18} aria-hidden="true" /><span>Consultar estado</span></button>}</div>
        {needsRut && <motion.div className="mt-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><label htmlFor="tracking-rut">RUT asociado a la solicitud</label><div className="tracking-input-row"><input id="tracking-rut" value={rut} onChange={(event) => { setRut(event.target.value); setError(""); }} placeholder="Ej: 12.345.678-9" autoComplete="off" /><button type="submit" disabled={loading}><Search size={18} aria-hidden="true" /><span>{loading ? "Validando..." : "Ver solicitud"}</span></button></div></motion.div>}
        {error && <motion.p className="mt-3 text-sm font-semibold text-red-700" role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{error}</motion.p>}
      </form><p className="tracking-security"><LockKeyhole size={16} aria-hidden="true" /> Información 100% segura y confidencial.</p>
    </motion.div><motion.div className="tracking-visual-placeholder" initial={{ opacity: 0, scale: 1.02 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.65 }} aria-hidden="true"><div className="tracking-tranquility"><Check size={17} aria-hidden="true" /> Tu tranquilidad, en cada etapa.</div></motion.div></div>
    {summary ? <motion.section className="mx-auto mt-8 max-w-5xl px-5 sm:px-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} aria-live="polite"><div className="card-surface rounded-2xl p-5 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Resumen protegido</p><h3 className="mt-2 text-2xl font-bold text-[var(--navy)]">Solicitud {summary.requestNumber}</h3></div><span className="rounded-full bg-[rgba(8,127,213,0.1)] px-3 py-2 text-sm font-bold text-[var(--blue)]">{labels[summary.status] || summary.status}</span></div><div className="mt-6 grid gap-4 border-y border-[var(--border)] py-4 text-sm sm:grid-cols-2"><p><strong className="block text-[var(--navy)]">Creada</strong><span className="text-[var(--text-secondary)]">{date(summary.createdAt)}</span></p><p><strong className="block text-[var(--navy)]">Última actualización</strong><span className="text-[var(--text-secondary)]">{date(summary.updatedAt)}</span></p></div><div className="mt-5"><h4 className="font-bold text-[var(--navy)]">Medicamentos solicitados</h4><ul className="mt-3 grid gap-2 text-sm text-[var(--text-secondary)]">{summary.medications.map((medication) => <li key={`${medication.commercialName}-${medication.concentration}`} className="flex justify-between gap-4 border-b border-[var(--border)] py-2"><span>{medication.commercialName} · {medication.concentration}</span><strong>{medication.tabletQuantity} unidades</strong></li>)}</ul></div>{summary.hasQuote ? <a className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--brand-gradient)] px-5 py-3 text-sm font-bold text-white" href={`/seguimiento/${encodeURIComponent(summary.requestNumber)}`}>Ver cotización <ArrowRight size={17} aria-hidden="true" /></a> : <p className="mt-6 text-sm font-semibold text-[var(--text-secondary)]">Tu solicitud continúa en revisión. Te mostraremos la cotización cuando esté disponible.</p>}</div></motion.section> : <><div className="tracking-process-head"><span className="brand-gradient" /><h3>Así avanza tu solicitud</h3><span className="brand-gradient" /></div><motion.div className="tracking-stages" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>{stages.map(([number, label, title]) => <motion.article className="tracking-stage" key={number} variants={{ hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0 } }}><div className="tracking-stage-heading"><span>{number}</span><strong>{label}</strong></div><div className="tracking-stage-line"><i className={number === "01" ? "is-complete" : ""} /></div><p>{title}</p><small>Según avance de tu solicitud</small></motion.article>)}</motion.div></>}
  </section>;
}
