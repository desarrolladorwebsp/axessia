"use client";

import { useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, Upload } from "lucide-react";

type Props = {
  requestId?: string;
  trackingToken?: string | null;
  paymentStatus?: string | null;
  onUploaded?: () => void | Promise<void>;
};

export default function TransferPaymentUpload({ requestId, trackingToken, paymentStatus, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const paid = paymentStatus === "PAID";

  if (paid) return null;

  const upload = async (file: File) => {
    if (busy) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("El comprobante no puede superar los 10 MB.");
      return;
    }
    if (!requestId && !trackingToken) {
      setError("La sesión de la solicitud expiró. Vuelve a ingresar al seguimiento.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    if (requestId) formData.append("requestId", requestId);
    if (trackingToken) formData.append("token", trackingToken);

    try {
      setBusy(true);
      setError("");
      setFeedback("");
      const response = await fetch("/api/payments/transfer", { method: "POST", body: formData });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "No fue posible cargar el comprobante.");
      setFeedback("Comprobante recibido. AXESSIA revisará la transferencia y confirmará el pago.");
      if (onUploaded) await onUploaded();
      else window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar el comprobante.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-xl border border-[var(--blue)]/20 bg-blue-50/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-extrabold text-[var(--navy)]">Pago por transferencia bancaria</h4>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">Adjunta el comprobante para que el equipo AXESSIA pueda revisar y confirmar el pago.</p>
        </div>
        {paymentStatus === "PENDING" || paymentStatus === "PROCESSING" ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold text-amber-800">Comprobante recibido</span> : null}
      </div>
      <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[var(--blue)] bg-white px-4 py-2 text-xs font-bold text-[var(--blue)] transition hover:bg-blue-50">
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {busy ? "Cargando comprobante…" : "Adjuntar comprobante"}
        <input ref={inputRef} type="file" accept="application/pdf,image/*" className="sr-only" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
      </label>
      <p className="mt-2 text-[11px] text-[var(--text-secondary)]">PDF o imagen · máximo 10 MB</p>
      {feedback ? <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" />{feedback}</p> : null}
      {error ? <p className="mt-3 text-xs font-semibold text-rose-600" role="alert">{error}</p> : null}
    </div>
  );
}
