"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, PackageCheck, Send, ShieldAlert } from "lucide-react";
import Modal from "../../components/Modal";
import { PrimaryButton, SecondaryButton } from "../../components/Buttons";

export type RequestActionResult = { status: string; updatedAt?: string; mandateUrl?: string };

type Step = "choose" | "send-mandate" | "reject" | "shipping" | "complete";
type Action = "SEND_MANDATE" | "REJECT" | "START_SHIPPING" | "COMPLETE";
type Stage = "idle" | "submitting" | "success" | "error";

const activeStatuses = ["RECEIVED", "SOURCING", "QUOTED", "AWAITING_DECISION", "ACCEPTED", "SHIPPING"];

const configurations: Record<Exclude<Step, "choose">, { title: string; action: Action; confirm: string; description: string; requiresFile?: boolean; requiresNote?: boolean; optionalNote?: boolean }> = {
  "send-mandate": { title: "Enviar poder", action: "SEND_MANDATE", confirm: "Generar y enviar mandato", description: "¿Confirmas que deseas generar y enviar el mandato al cliente? El PDF se adjuntará al correo registrado para que pueda firmarlo, notarizarlo y devolverlo a AXESSIA.", optionalNote: true },
  reject: { title: "Rechazar solicitud", action: "REJECT", confirm: "Confirmar rechazo", description: "Esta acción cambia la solicitud a Rechazada. Debes indicar el motivo.", requiresNote: true },
  shipping: { title: "En despacho", action: "START_SHIPPING", confirm: "Confirmar despacho", description: "Cambia la solicitud a En despacho. Puedes dejar información adicional para el historial.", optionalNote: true },
  complete: { title: "Finalizar solicitud", action: "COMPLETE", confirm: "Finalizar solicitud", description: "Cambia la solicitud a Finalizada. Puedes dejar una nota opcional para el historial.", optionalNote: true },
};

export default function RequestActionsModal({ open, onClose, requestId, currentStatus, onUpdated }: { open: boolean; onClose: () => void; requestId: string; currentStatus: string; onUpdated: (result: RequestActionResult) => void }) {
  const [step, setStep] = useState<Step>("choose");
  const [note, setNote] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const [mandateUrl, setMandateUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep("choose");
    setNote("");
    setStage("idle");
    setError("");
    setMandateUrl("");
  }, [open]);

  const selected = step === "choose" ? null : configurations[step];
  const isBusy = stage === "submitting";
  const isActive = activeStatuses.includes(currentStatus);

  const submit = async () => {
    if (!selected || isBusy || (selected.requiresNote && !note.trim())) return;
    try {
      setStage("submitting");
      setError("");
      const response = await fetch(`/api/quote-requests/${requestId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: selected.action,
          reason: selected.action === "REJECT" ? note.trim() : undefined,
          note: selected.action === "REJECT" ? undefined : note.trim() || undefined,
        }),
      });
      const result = (await response.json()) as { error?: string } & RequestActionResult;
      if (!response.ok) throw new Error(result.error || "No fue posible registrar la gestión");
      if (result.mandateUrl) setMandateUrl(result.mandateUrl);
      onUpdated(result);
      setStage("success");
    } catch (submitError) {
      setStage("error");
      setError(submitError instanceof Error ? submitError.message : "No fue posible registrar la gestión");
    }
  };

  const successMessage = step === "send-mandate" ? "El envío del poder fue registrado." : step === "reject" ? "La solicitud fue marcada como rechazada." : step === "shipping" ? "La solicitud pasó a En despacho." : "La solicitud fue marcada como finalizada.";

  return (
    <Modal open={open} onClose={() => !isBusy && onClose()} dismissible={false} title={stage === "success" ? "Gestión registrada" : selected?.title || "Gestionar solicitud"} maxWidthClassName="max-w-md" footer={stage === "success" ? <div className="flex justify-end"><PrimaryButton size="sm" onClick={onClose}>Cerrar</PrimaryButton></div> : step === "choose" ? <div className="flex justify-end"><SecondaryButton size="sm" onClick={onClose}>Cerrar</SecondaryButton></div> : <div className="flex justify-end gap-2"><SecondaryButton size="sm" onClick={() => setStep("choose")} disabled={isBusy}>Volver</SecondaryButton><PrimaryButton size="sm" onClick={() => void submit()} disabled={isBusy || Boolean(selected?.requiresNote && !note.trim())} icon={isBusy ? Loader2 : undefined} className={isBusy ? "[&_svg]:animate-spin" : ""}>{isBusy ? "Generando y enviando..." : selected?.confirm}</PrimaryButton></div>}>
      {stage === "success" ? <div className="flex flex-col items-center gap-3 py-6 text-center"><CheckCircle2 className="h-7 w-7 text-emerald-600" /><p className="text-sm font-semibold text-[var(--navy)]">{successMessage}</p>{mandateUrl && <a href={mandateUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-[var(--blue)] underline underline-offset-4">Ver mandato generado</a>}</div> : step === "choose" ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
        {isActive && <ActionOption icon={Send} title="Enviar poder" description="Envía el mandato o poder para firma y notarización." onClick={() => setStep("send-mandate")} />}
        {isActive && <ActionOption icon={ShieldAlert} title="Rechazar solicitud" description="Registra un motivo obligatorio y cambia el estado." danger onClick={() => setStep("reject")} />}
        {currentStatus === "ACCEPTED" && <ActionOption icon={PackageCheck} title="En despacho" description="Cambia el estado y registra una nota opcional." onClick={() => setStep("shipping")} />}
        {currentStatus === "SHIPPING" && <ActionOption icon={CheckCircle2} title="Finalizar solicitud" description="Cambia el estado y registra una nota opcional." onClick={() => setStep("complete")} />}
        {!isActive && <p className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--text-secondary)]">No hay gestiones manuales disponibles para el estado actual.</p>}
      </motion.div> : <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4"><p className="text-sm text-[var(--text-secondary)]">{selected?.description}</p>{(selected?.requiresNote || selected?.optionalNote) && <label className="block text-xs font-bold text-[var(--navy)]">{selected.requiresNote ? "Motivo de rechazo" : "Nota para el historial (opcional)"}<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={selected.requiresNote ? "Describe por qué se rechaza esta solicitud..." : "Agrega información adicional si corresponde..."} rows={4} className="field-input mt-2" /></label>}{stage === "error" && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}</motion.div>}
    </Modal>
  );
}

function ActionOption({ icon: Icon, title, description, onClick, danger = false }: { icon: typeof Send; title: string; description: string; onClick: () => void; danger?: boolean }) {
  return <button type="button" onClick={onClick} className={`flex w-full items-start gap-3 rounded-xl border border-[var(--border)] p-4 text-left transition hover:bg-[var(--background)] ${danger ? "hover:border-rose-300" : "hover:border-[var(--blue)]"}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${danger ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-[var(--blue)]"}`}><Icon className="h-4 w-4" /></span><span><strong className={`block text-sm ${danger ? "text-rose-700" : "text-[var(--navy)]"}`}>{title}</strong><span className="mt-1 block text-xs text-[var(--text-secondary)]">{description}</span></span></button>;
}