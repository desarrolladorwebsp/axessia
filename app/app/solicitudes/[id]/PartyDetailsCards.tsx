"use client";

import { useState } from "react";
import { Pencil, Save, UserRound, X } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "../../components/Buttons";

type Customer = { name: string; email: string; phone: string; rut: string; city: string };
type Patient = { name: string; rut: string };

export default function PartyDetailsCards({ requestId, customer, patient, onUpdated }: { requestId: string; customer: Customer; patient: Patient; onUpdated: (values: { customer?: Customer; patient?: Patient }) => void }) {
  return <aside className="space-y-6"><PartyCard title="Cliente" icon={UserRound} values={customer} fields={["name", "email", "phone", "rut", "city"]} labels={{ name: "Nombre", email: "Correo", phone: "Teléfono", rut: "RUT", city: "Ciudad" }} requestId={requestId} type="customer" onSaved={(values) => onUpdated({ customer: values as Customer })} /><PartyCard title="Paciente" icon={UserRound} values={patient} fields={["name", "rut"]} labels={{ name: "Nombre", rut: "RUT" }} requestId={requestId} type="patient" onSaved={(values) => onUpdated({ patient: values as Patient })} /></aside>;
}

function PartyCard({ title, icon: Icon, values, fields, labels, requestId, type, onSaved }: { title: string; icon: typeof UserRound; values: Record<string, string>; fields: string[]; labels: Record<string, string>; requestId: string; type: "customer" | "patient"; onSaved: (values: Record<string, string>) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(values);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const startEditing = () => { setDraft(values); setError(""); setEditing(true); };
  const save = async () => {
    if (isSaving) return;
    try {
      setIsSaving(true); setError("");
      const response = await fetch(`/api/quote-requests/${requestId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [type]: draft }) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "No fue posible guardar los cambios.");
      onSaved(draft); setEditing(false);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "No fue posible guardar los cambios."); }
    finally { setIsSaving(false); }
  };
  return <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[0_10px_28px_rgba(7,30,65,0.04)]"><div className="mb-5 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--blue)]/10 text-[var(--blue)]"><Icon className="h-4 w-4" /></div><h2 className="font-display text-base font-extrabold text-[var(--navy)]">{title}</h2></div>{!editing && <button type="button" className="icon-button-small" onClick={startEditing} aria-label={`Editar ${title.toLowerCase()}`} title={`Editar ${title.toLowerCase()}`}><Pencil className="h-3.5 w-3.5" /></button>}</div>{editing ? <div className="space-y-3">{fields.map((field) => <label key={field} className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">{labels[field]}<input value={draft[field] || ""} onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))} className="field-input mt-1" type={field === "email" ? "email" : "text"} /></label>)}{error && <p className="text-xs font-semibold text-rose-600">{error}</p>}<div className="flex justify-end gap-2"><SecondaryButton size="sm" onClick={() => setEditing(false)} disabled={isSaving} icon={X}>Cancelar</SecondaryButton><PrimaryButton size="sm" onClick={() => void save()} disabled={isSaving} icon={Save}>{isSaving ? "Guardando..." : "Guardar"}</PrimaryButton></div></div> : <dl className="space-y-4">{fields.map((field) => <div key={field}><dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">{labels[field]}</dt><dd className="mt-1 break-words text-sm font-semibold text-[var(--navy)]">{values[field] || "No informado"}</dd></div>)}</dl>}</section>;
}