"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  HelpCircle,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { formatMoney } from "@/components/portal/format";

type PaymentSummary = {
  id: string;
  status: string;
  amount: string;
  currency: string;
  providerReference: string | null;
  failureReason: string | null;
  helpMessage: string | null;
};

type QuoteActionsProps = {
  quoteId: string;
  canDecide: boolean;
  canPay: boolean;
  canAdvanceWithoutPayment: boolean;
  payment: PaymentSummary | null;
  confirmOnReturn?: boolean;
  returnPath?: string;
};

type ConfirmKind = "accept" | "reject" | "advance" | null;
type BusyAction = null | "accept" | "reject" | "start_payment" | "confirm_payment" | "advance" | "help";

const paymentLabels: Record<string, string> = {
  PENDING: "Pendiente",
  PROCESSING: "En proceso",
  PAID: "Pagado",
  FAILED: "Rechazado",
  CANCELLED: "Cancelado",
  HELP_REQUESTED: "Ayuda solicitada",
};

export default function QuoteActions({
  quoteId,
  canDecide,
  canPay,
  canAdvanceWithoutPayment,
  payment,
  confirmOnReturn = false,
  returnPath,
}: QuoteActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<BusyAction>(null);
  const [feedback, setFeedback] = useState("");
  const [comment, setComment] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [helpMessage, setHelpMessage] = useState("");
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [showHelp, setShowHelp] = useState(false);

  const isBusy = busy !== null;
  const paymentPaid = payment?.status === "PAID";
  const paymentFailed = payment?.status === "FAILED" || payment?.status === "CANCELLED" || payment?.status === "HELP_REQUESTED";

  const refresh = () => router.refresh();

  const postDecision = async (action: "accept" | "reject") => {
    const response = await fetch(`/api/portal/quotes/${encodeURIComponent(quoteId)}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comment: comment.trim() || undefined }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(result.error || "No fue posible registrar la decisión.");
  };

  const postPayment = async (action: "start_payment" | "confirm_payment" | "advance_without_payment" | "payment_help") => {
    const response = await fetch("/api/portal/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteId,
        action,
        paymentId: payment?.id,
        message: helpMessage.trim() || undefined,
      }),
    });
    const result = (await response.json()) as { error?: string; message?: string; checkoutUrl?: string | null };
    if (!response.ok) throw new Error(result.error || "No fue posible completar la acción.");
    return result;
  };

  useEffect(() => {
    if (!confirmOnReturn) return;
    const run = async () => {
      try {
        setBusy("confirm_payment");
        setFeedback("Confirmando el resultado de tu pago con Banchile Pagos…");
        const result = await postPayment("confirm_payment");
        setFeedback(result.message || "Resultado de pago verificado.");
        refresh();
      } catch (cause) {
        setFeedback(cause instanceof Error ? cause.message : "No fue posible confirmar el resultado del pago.");
      } finally {
        setBusy(null);
        window.history.replaceState(null, "", returnPath || "/mi-cuenta");
      }
    };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- confirm once after Banchile return
  }, [confirmOnReturn, quoteId]);

  const confirmDecision = async () => {
    if (!confirmKind || confirmKind === "advance" || isBusy) return;
    if (confirmKind === "reject" && !comment.trim()) {
      setRejectError("Indica el motivo antes de rechazar la cotización.");
      return;
    }
    try {
      setBusy(confirmKind);
      setFeedback("");
      await postDecision(confirmKind);
      setConfirmKind(null);
      setComment("");
      setFeedback(confirmKind === "accept" ? "Tu aceptación fue registrada." : "Tu rechazo fue registrado.");
      refresh();
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "No fue posible registrar la decisión.");
    } finally {
      setBusy(null);
    }
  };

  const confirmAdvance = async () => {
    try {
      setBusy("advance");
      const result = await postPayment("advance_without_payment");
      setConfirmKind(null);
      setFeedback(result.message || "Registramos que deseas continuar sin pagar ahora.");
      refresh();
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "No fue posible registrar el avance sin pago.");
    } finally {
      setBusy(null);
    }
  };

  const startCheckout = async () => {
    try {
      setBusy("start_payment");
      setFeedback("");
      const result = await postPayment("start_payment");
      if (result.checkoutUrl) {
        setFeedback("Redirigiendo al Web Checkout de Banchile Pagos…");
        window.location.href = result.checkoutUrl;
        return;
      }
      setFeedback(result.message || "Proceso de pago iniciado.");
      refresh();
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "No fue posible iniciar el pago.");
    } finally {
      setBusy(null);
    }
  };

  const submitHelp = async () => {
    if (!helpMessage.trim()) {
      setFeedback("Describe el problema con el pago para solicitar ayuda.");
      return;
    }
    try {
      setBusy("help");
      const result = await postPayment("payment_help");
      setShowHelp(false);
      setHelpMessage("");
      setFeedback(result.message || "Solicitud de ayuda enviada.");
      refresh();
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "No fue posible solicitar ayuda.");
    } finally {
      setBusy(null);
    }
  };

  if (!canDecide && !canPay && !canAdvanceWithoutPayment && !payment) {
    return null;
  }

  return (
    <section className="mt-8 space-y-4 border-t border-[var(--border)] pt-6">
      {feedback ? (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-semibold text-[var(--navy)]" role="status">
          {feedback}
        </p>
      ) : null}

      {canDecide ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setConfirmKind("accept")}
            className="brand-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy === "accept" ? <LoaderCircle className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
            Aceptar cotización
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => { setRejectError(""); setConfirmKind("reject"); }}
            className="inline-flex items-center gap-2 rounded-full border border-rose-300 px-5 py-3 text-sm font-bold text-rose-700 disabled:opacity-50"
          >
            {busy === "reject" ? <LoaderCircle className="animate-spin" size={16} /> : <CircleAlert size={16} />}
            Rechazar cotización
          </button>
        </div>
      ) : null}

      {(canPay || canAdvanceWithoutPayment || payment) ? (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-[var(--navy)]">Pago</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            El monto se toma desde la cotización registrada. Iniciar un pago no marca la solicitud como pagada hasta la confirmación de Banchile Pagos.
          </p>
          {payment ? (
            <div className={`rounded-xl border p-4 ${paymentPaid ? "border-emerald-200 bg-emerald-50" : paymentFailed ? "border-amber-200 bg-amber-50" : "border-[var(--border)] bg-[var(--background)]"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-[var(--navy)]">Pago: {paymentLabels[payment.status] || payment.status}</p>
                <p className="text-sm font-semibold text-[var(--navy)]">{formatMoney(payment.amount)} {payment.currency}</p>
              </div>
              {payment.providerReference ? <p className="mt-1 text-xs text-[var(--text-secondary)]">Ref: {payment.providerReference}</p> : null}
              {payment.failureReason ? <p className="mt-2 text-sm font-semibold text-amber-800">{payment.failureReason}</p> : null}
            </div>
          ) : null}
          {paymentPaid ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
              <CheckCircle2 size={18} /> Tu pago fue confirmado por la pasarela.
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {canPay ? (
                <button type="button" disabled={isBusy} onClick={() => void startCheckout()} className="brand-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
                  {busy === "start_payment" ? <LoaderCircle className="animate-spin" size={16} /> : <CreditCard size={16} />}
                  {paymentFailed ? "Reintentar pago" : "Pagar ahora"}
                </button>
              ) : null}
              {canAdvanceWithoutPayment ? (
                <button type="button" disabled={isBusy} onClick={() => setConfirmKind("advance")} className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-3 text-sm font-bold text-[var(--navy)] disabled:opacity-50">
                  Avanzar sin pago
                </button>
              ) : null}
              {canPay ? (
                <button type="button" disabled={isBusy} onClick={() => setShowHelp(true)} className="inline-flex items-center gap-2 rounded-full border border-[var(--purple)] px-5 py-3 text-sm font-bold text-[var(--purple)] disabled:opacity-50">
                  <HelpCircle size={16} /> Solicitar ayuda
                </button>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      <AnimatePresence>
        {confirmKind ? (
          <Overlay
            title={confirmKind === "accept" ? "Confirmar aceptación" : confirmKind === "reject" ? "Confirmar rechazo" : "Confirmar avance sin pago"}
            onClose={() => !isBusy && setConfirmKind(null)}
          >
            <p className="text-sm text-[var(--text-secondary)]">
              {confirmKind === "accept"
                ? "¿Confirmas que deseas aceptar esta cotización?"
                : confirmKind === "reject"
                  ? "¿Confirmas que deseas rechazar esta cotización? Se registrará el motivo y la fecha."
                  : "¿Confirmas que deseas continuar el proceso sin pagar ahora?"}
            </p>
            {confirmKind === "accept" ? (
              <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                <div className="flex items-start gap-2">
                  <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[var(--blue)]" aria-hidden="true" />
                  <p className="text-sm text-[var(--text-secondary)]">Al aceptar, registramos tu decisión. El pago se gestiona por separado y usa el total de la cotización almacenada.</p>
                </div>
              </div>
            ) : null}
            {confirmKind === "reject" ? (
              <div className="mt-4">
                <label className="block text-sm font-bold text-[var(--navy)]" htmlFor="portal-reject-reason">Motivo del rechazo</label>
                <textarea
                  id="portal-reject-reason"
                  className="mt-2 min-h-24 w-full rounded-xl border border-[var(--border)] p-3 text-sm outline-none focus:border-[var(--blue)]"
                  value={comment}
                  onChange={(event) => { setComment(event.target.value); setRejectError(""); }}
                  disabled={isBusy}
                />
                {rejectError ? <p className="mt-2 text-xs font-semibold text-rose-600">{rejectError}</p> : null}
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" disabled={isBusy} onClick={() => { setConfirmKind(null); setComment(""); }} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-bold text-[var(--navy)]">Cancelar</button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => { if (confirmKind === "advance") void confirmAdvance(); else void confirmDecision(); }}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--navy)] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {isBusy ? <LoaderCircle className="animate-spin" size={14} /> : null}
                Confirmar
              </button>
            </div>
          </Overlay>
        ) : null}

        {showHelp ? (
          <Overlay title="Solicitar ayuda con el pago" onClose={() => !isBusy && setShowHelp(false)}>
            <p className="text-sm text-[var(--text-secondary)]">Describe qué ocurrió con el pago. Mantendrás tu cotización aceptada.</p>
            <textarea
              className="mt-4 min-h-28 w-full rounded-xl border border-[var(--border)] p-3 text-sm outline-none focus:border-[var(--blue)]"
              value={helpMessage}
              onChange={(event) => setHelpMessage(event.target.value)}
              disabled={isBusy}
            />
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" disabled={isBusy} onClick={() => setShowHelp(false)} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-bold text-[var(--navy)]">Cancelar</button>
              <button type="button" disabled={isBusy || !helpMessage.trim()} onClick={() => void submitHelp()} className="inline-flex items-center gap-2 rounded-xl bg-[var(--navy)] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                {busy === "help" ? <LoaderCircle className="animate-spin" size={14} /> : <AlertTriangle size={14} />}
                Enviar solicitud de ayuda
              </button>
            </div>
          </Overlay>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function Overlay({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--navy-dark)]/55 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-[0_20px_60px_rgba(7,30,65,0.25)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="portal-dialog-title"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 id="portal-dialog-title" className="text-base font-extrabold text-[var(--navy)]">{title}</h3>
          <button type="button" onClick={onClose} className="text-xs font-bold text-[var(--text-secondary)]">Cerrar</button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
