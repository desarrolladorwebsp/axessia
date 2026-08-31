"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert, UserCog } from "lucide-react";
import Modal from "../../components/Modal";
import { PrimaryButton, SecondaryButton } from "../../components/Buttons";
import Avatar from "../../components/Avatar";

type ExecutiveOption = { id: string; firstName: string; lastName: string; role: string };

export type ManageStatusResult = {
  status: string;
  assignedExecutive?: { id: string; firstName: string; lastName: string } | null;
  note?: { id: string; executiveName: string; message: string; createdAt: string };
};

type Step = "choose" | "assign-select" | "assign-confirm" | "reject" | "shipping-confirm" | "complete-confirm";
type Stage = "idle" | "submitting" | "success" | "error";

const manageableRoles = ["EJECUTIVO", "ADMINISTRADOR"];

export default function ManageStatusModal({
  open,
  onClose,
  requestId,
  currentStatus,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  requestId: string;
  currentStatus: string;
  onUpdated: (result: ManageStatusResult) => void;
}) {
  const [step, setStep] = useState<Step>("choose");
  const [executives, setExecutives] = useState<ExecutiveOption[]>([]);
  const [isLoadingExecutives, setIsLoadingExecutives] = useState(false);
  const [selectedExecutiveId, setSelectedExecutiveId] = useState("");
  const [reason, setReason] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep("choose");
    setSelectedExecutiveId("");
    setReason("");
    setStage("idle");
    setError("");
  }, [open]);

  useEffect(() => {
    if (!open || step !== "assign-select" || executives.length) return;
    const fetchExecutives = async () => {
      try {
        setIsLoadingExecutives(true);
        const response = await fetch("/api/users?limit=100");
        if (!response.ok) throw new Error("No fue posible cargar los ejecutivos");
        const result = (await response.json()) as { users: ExecutiveOption[] };
        setExecutives(result.users.filter((user) => manageableRoles.includes(user.role)));
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "No fue posible cargar los ejecutivos");
      } finally {
        setIsLoadingExecutives(false);
      }
    };
    fetchExecutives();
  }, [open, step, executives.length]);

  const selectedExecutive = executives.find((executive) => executive.id === selectedExecutiveId) || null;
  const isBusy = stage === "submitting";

  const requestClose = () => {
    if (isBusy) return;
    onClose();
  };

  const confirmManagement = async () => {
    if (!selectedExecutive || isBusy) return;
    try {
      setStage("submitting");
      setError("");
      const response = await fetch(`/api/quote-requests/${requestId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CONFIRM_MANAGEMENT", executiveId: selectedExecutive.id }),
      });
      const result = (await response.json()) as { error?: string } & ManageStatusResult;
      if (!response.ok) throw new Error(result.error || "No fue posible confirmar la gestión");
      onUpdated(result);
      setStage("success");
    } catch (submitError) {
      setStage("error");
      setError(submitError instanceof Error ? submitError.message : "No fue posible confirmar la gestión");
    }
  };

  const confirmRejection = async () => {
    if (!reason.trim() || isBusy) return;
    try {
      setStage("submitting");
      setError("");
      const response = await fetch(`/api/quote-requests/${requestId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT", reason: reason.trim() }),
      });
      const result = (await response.json()) as { error?: string } & ManageStatusResult;
      if (!response.ok) throw new Error(result.error || "No fue posible rechazar la solicitud");
      onUpdated(result);
      setStage("success");
    } catch (submitError) {
      setStage("error");
      setError(submitError instanceof Error ? submitError.message : "No fue posible rechazar la solicitud");
    }
  };

  const confirmTransition = async (action: "START_SHIPPING" | "COMPLETE") => {
    if (isBusy) return;
    try {
      setStage("submitting");
      setError("");
      const response = await fetch(`/api/quote-requests/${requestId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = (await response.json()) as { error?: string } & ManageStatusResult;
      if (!response.ok) throw new Error(result.error || "No fue posible actualizar la solicitud");
      onUpdated(result);
      setStage("success");
    } catch (submitError) {
      setStage("error");
      setError(submitError instanceof Error ? submitError.message : "No fue posible actualizar la solicitud");
    }
  };

  const title =
    stage === "success"
      ? step === "reject"
        ? "Solicitud rechazada"
        : step === "shipping-confirm"
          ? "Despacho iniciado"
          : step === "complete-confirm"
            ? "Solicitud finalizada"
        : "Gestión confirmada"
      : step === "reject"
        ? "Rechazar solicitud"
        : step === "assign-confirm"
          ? "Confirmar asignación"
          : step === "assign-select"
            ? "Asignar ejecutivo responsable"
            : step === "shipping-confirm"
              ? "Iniciar despacho"
              : step === "complete-confirm"
                ? "Finalizar solicitud"
            : "Gestionar estado";

  return (
    <Modal
      open={open}
      onClose={requestClose}
      dismissible={false}
      title={title}
      maxWidthClassName="max-w-md"
      footer={
        stage === "success" ? (
          <div className="flex justify-end">
            <PrimaryButton size="sm" onClick={onClose}>Cerrar</PrimaryButton>
          </div>
        ) : step === "choose" ? (
          <div className="flex justify-end">
            <SecondaryButton size="sm" onClick={requestClose}>Cerrar</SecondaryButton>
          </div>
        ) : step === "assign-select" ? (
          <div className="flex justify-end gap-2">
            <SecondaryButton size="sm" onClick={() => setStep("choose")}>Volver</SecondaryButton>
            <PrimaryButton size="sm" onClick={() => setStep("assign-confirm")} disabled={!selectedExecutive}>Continuar</PrimaryButton>
          </div>
        ) : step === "assign-confirm" ? (
          <div className="flex justify-end gap-2">
            <SecondaryButton size="sm" onClick={() => setStep("assign-select")} disabled={isBusy}>Volver</SecondaryButton>
            <PrimaryButton size="sm" onClick={confirmManagement} disabled={isBusy} icon={isBusy ? Loader2 : undefined} className={isBusy ? "[&_svg]:animate-spin" : ""}>
              {isBusy ? "Confirmando..." : "Confirmar asignación"}
            </PrimaryButton>
          </div>
        ) : step === "shipping-confirm" ? (
          <div className="flex justify-end gap-2">
            <SecondaryButton size="sm" onClick={() => setStep("choose")} disabled={isBusy}>Cancelar</SecondaryButton>
            <PrimaryButton size="sm" onClick={() => confirmTransition("START_SHIPPING")} disabled={isBusy} icon={isBusy ? Loader2 : undefined} className={isBusy ? "[&_svg]:animate-spin" : ""}>{isBusy ? "Actualizando..." : "Confirmar despacho"}</PrimaryButton>
          </div>
        ) : step === "complete-confirm" ? (
          <div className="flex justify-end gap-2">
            <SecondaryButton size="sm" onClick={() => setStep("choose")} disabled={isBusy}>Cancelar</SecondaryButton>
            <PrimaryButton size="sm" onClick={() => confirmTransition("COMPLETE")} disabled={isBusy} icon={isBusy ? Loader2 : undefined} className={isBusy ? "[&_svg]:animate-spin" : ""}>{isBusy ? "Actualizando..." : "Finalizar solicitud"}</PrimaryButton>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <SecondaryButton size="sm" onClick={() => setStep("choose")} disabled={isBusy}>Cancelar</SecondaryButton>
            <PrimaryButton size="sm" onClick={confirmRejection} disabled={isBusy || !reason.trim()} icon={isBusy ? Loader2 : undefined} className={isBusy ? "[&_svg]:animate-spin" : ""}>
              {isBusy ? "Rechazando..." : "Confirmar rechazo"}
            </PrimaryButton>
          </div>
        )
      }
    >
      {stage === "success" ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          <p className="text-sm font-semibold text-[var(--navy)]">
            {step === "reject" ? "La solicitud fue marcada como rechazada." : step === "shipping-confirm" ? "La solicitud pasó a En despacho." : step === "complete-confirm" ? "La solicitud fue marcada como finalizada." : "El ejecutivo fue asignado y la solicitud pasó a En gestión."}
          </p>
        </div>
      ) : step === "choose" ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {currentStatus === "RECEIVED" && <button
            type="button"
            onClick={() => setStep("assign-select")}
            className="flex w-full items-start gap-3 rounded-xl border border-[var(--border)] p-4 text-left transition hover:border-[var(--blue)] hover:bg-[var(--background)]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[var(--blue)]"><UserCog className="h-4 w-4" /></div>
            <div>
              <p className="text-sm font-bold text-[var(--navy)]">Confirmar recepción / iniciar gestión</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Asigna un ejecutivo responsable y mueve la solicitud a &quot;En gestión&quot;.</p>
            </div>
          </button>}
          {currentStatus === "ACCEPTED" && <button
            type="button"
            onClick={() => setStep("shipping-confirm")}
            className="flex w-full items-start gap-3 rounded-xl border border-[var(--border)] p-4 text-left transition hover:border-[var(--blue)] hover:bg-[var(--background)]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[var(--blue)]"><UserCog className="h-4 w-4" /></div>
            <div><p className="text-sm font-bold text-[var(--navy)]">Iniciar despacho</p><p className="mt-1 text-xs text-[var(--text-secondary)]">Confirma que el medicamento entra en proceso de despacho o envío.</p></div>
          </button>}
          {currentStatus === "SHIPPING" && <button
            type="button"
            onClick={() => setStep("complete-confirm")}
            className="flex w-full items-start gap-3 rounded-xl border border-[var(--border)] p-4 text-left transition hover:border-[var(--blue)] hover:bg-[var(--background)]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-4 w-4" /></div>
            <div><p className="text-sm font-bold text-[var(--navy)]">Finalizar solicitud</p><p className="mt-1 text-xs text-[var(--text-secondary)]">Confirma que el proceso de despacho fue completado.</p></div>
          </button>}
          {["RECEIVED", "SOURCING", "QUOTED", "AWAITING_DECISION"].includes(currentStatus) && <button
            type="button"
            onClick={() => setStep("reject")}
            className="flex w-full items-start gap-3 rounded-xl border border-[var(--border)] p-4 text-left transition hover:border-rose-300 hover:bg-rose-50"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600"><ShieldAlert className="h-4 w-4" /></div>
            <div>
              <p className="text-sm font-bold text-rose-700">Rechazar solicitud</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Registra un motivo obligatorio y marca la solicitud como rechazada.</p>
            </div>
          </button>}
          {!['RECEIVED', 'SOURCING', 'QUOTED', 'AWAITING_DECISION', 'ACCEPTED', 'SHIPPING'].includes(currentStatus) && <p className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--text-secondary)]">No hay gestiones manuales disponibles para el estado actual.</p>}
        </motion.div>
      ) : step === "assign-select" ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <label className="block text-xs font-bold text-[var(--navy)]">
            Ejecutivo responsable
            {isLoadingExecutives ? (
              <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-secondary)]"><Loader2 className="h-3.5 w-3.5 animate-spin" />Cargando ejecutivos...</div>
            ) : (
              <select
                value={selectedExecutiveId}
                onChange={(event) => setSelectedExecutiveId(event.target.value)}
                className="field-input mt-2"
              >
                <option value="">Selecciona un ejecutivo</option>
                {executives.map((executive) => (
                  <option key={executive.id} value={executive.id}>{executive.firstName} {executive.lastName}</option>
                ))}
              </select>
            )}
          </label>
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
              <p className="text-xs font-semibold text-rose-700">{error}</p>
            </div>
          )}
        </motion.div>
      ) : step === "assign-confirm" ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
            <Avatar name={`${selectedExecutive?.firstName ?? ""} ${selectedExecutive?.lastName ?? ""}`} size="lg" />
            <div>
              <p className="text-sm font-bold text-[var(--navy)]">{selectedExecutive?.firstName} {selectedExecutive?.lastName}</p>
              <p className="text-xs text-[var(--text-secondary)]">Será el ejecutivo responsable de esta solicitud</p>
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Al confirmar, la solicitud pasará al estado <strong className="text-[var(--navy)]">En gestión</strong> y quedará asociada a este ejecutivo. Esta acción se registrará en el historial de la solicitud.
          </p>
          {stage === "error" && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
              <p className="text-xs font-semibold text-rose-700">{error}</p>
            </div>
          )}
        </motion.div>
      ) : step === "shipping-confirm" || step === "complete-confirm" ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">{step === "shipping-confirm" ? "Al confirmar, la solicitud pasará a En despacho y el cambio quedará registrado en su historial." : "Al confirmar, la solicitud pasará a Finalizada y el cambio quedará registrado en su historial."}</p>
          {stage === "error" && <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" /><p className="text-xs font-semibold text-rose-700">{error}</p></div>}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <label className="block text-xs font-bold text-[var(--navy)]">
            Motivo de rechazo
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Describe por qué se rechaza esta solicitud..."
              rows={4}
              className="field-input mt-2"
            />
          </label>
          <p className="text-xs text-[var(--text-secondary)]">La solicitud y su información se mantendrán registradas; solo cambiará su estado.</p>
          {stage === "error" && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
              <p className="text-xs font-semibold text-rose-700">{error}</p>
            </div>
          )}
        </motion.div>
      )}
    </Modal>
  );
}
