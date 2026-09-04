"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  Download,
  HelpCircle,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";

import { trackingStorageKey } from "@/lib/tracking-normalization";

type QuoteItem = {
  id: string;
  productName: string;
  activeIngredient: string | null;
  concentration: string | null;
  pharmaceuticalForm: string | null;
  presentation: string | null;
  unitsPerPackage: number | null;
  manufacturer: string | null;
  originCountry: string | null;
  supplierCountry: string | null;
  quantity: number;
  sanitaryRegistry: string | null;
  condition: "AVAILABLE" | "SPECIAL_IMPORT" | null;
  batchNumber: string | null;
  expirationDate: string | null;
  unitPrice: string | number | null;
  totalPrice: string | number | null;
};

type PaymentSummary = {
  id: string;
  status: "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED" | "HELP_REQUESTED";
  amount: string;
  currency: string;
  provider: string;
  providerReference: string | null;
  failureReason: string | null;
  helpMessage: string | null;
  paidAt: string | null;
  failedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Detail = {
  requestNumber: string;
  requesterName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  patientName: string | null;
  medications: Array<{ commercialName: string; activeIngredient: string; concentration: string; tabletQuantity: number }>;
  hasQuote: boolean;
  canDecide: boolean;
  canContinueAfterAccept: boolean;
  canPay: boolean;
  canAdvanceWithoutPayment: boolean;
  quote: {
    id: string;
    quoteNumber: string | null;
    version: number;
    status: string;
    total: string | number | null;
    validUntil: string | null;
    acceptedAt: string | null;
    sentAt: string | null;
    expired?: boolean;
    items: QuoteItem[];
  } | null;
  payment: PaymentSummary | null;
  payments: PaymentSummary[];
};

type ConfirmKind = "accept" | "reject" | "advance" | null;
type BusyAction = null | "accept" | "reject" | "start_payment" | "confirm_payment" | "advance" | "help" | "reload";

const labels: Record<string, string> = {
  RECEIVED: "Recibida",
  SOURCING: "En gestión",
  QUOTED: "Cotizada",
  AWAITING_DECISION: "Esperando respuesta",
  ACCEPTED: "Aceptada",
  SHIPPING: "En despacho",
  COMPLETED: "Finalizada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
};

const quoteLabels: Record<string, string> = {
  SENT: "Enviada",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  EXPIRED: "Vencida",
};

const paymentLabels: Record<string, string> = {
  PENDING: "Pendiente",
  PROCESSING: "En proceso",
  PAID: "Pagado",
  FAILED: "Rechazado",
  CANCELLED: "Cancelado",
  HELP_REQUESTED: "Ayuda solicitada",
};

const conditionLabels: Record<string, string> = {
  AVAILABLE: "Medicamento disponible",
  SPECIAL_IMPORT: "Importación especial",
};

const date = (value: string) => new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const money = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return `$${amount.toLocaleString("es-CL")}`;
};

function tokenKey(requestNumber: string) {
  return trackingStorageKey(requestNumber);
}

function getToken(requestNumber: string) {
  return sessionStorage.getItem(tokenKey(requestNumber));
}

export default function TrackingDetail({ requestNumber }: { requestNumber: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [helpMessage, setHelpMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [feedback, setFeedback] = useState("");
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [advancedWithoutPayment, setAdvancedWithoutPayment] = useState(false);

  const loadDetail = useCallback(async () => {
    const token = getToken(requestNumber);
    if (!token) {
      setError("Vuelve a /seguimiento y valida tu solicitud para continuar.");
      setDetail(null);
      return;
    }
    const response = await fetch(`/api/tracking/detail?token=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error("La sesión de seguimiento expiró. Vuelve a validar tu solicitud.");
    const payload = (await response.json()) as Detail;
    setDetail(payload);
    setError("");
  }, [requestNumber]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        await loadDetail();
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "No fue posible cargar la cotización.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [loadDetail]);

  const postAction = async (payload: Record<string, unknown>) => {
    const token = getToken(requestNumber);
    if (!token) throw new Error("La sesión de seguimiento expiró. Vuelve a validar tu solicitud.");
    const response = await fetch("/api/tracking/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, ...payload }),
    });
    const result = (await response.json()) as { error?: string; message?: string; status?: string; payment?: PaymentSummary | null; checkoutUrl?: string | null };
    if (!response.ok) throw new Error(result.error || "No fue posible completar la acción.");
    return result;
  };

  const isBusy = busy !== null;

  const paymentStatus = detail?.payment?.status;
  const quoteAccepted = detail?.status === "ACCEPTED" && detail.quote?.status === "ACCEPTED";
  const paymentPaid = paymentStatus === "PAID";
  const paymentFailed = paymentStatus === "FAILED" || paymentStatus === "CANCELLED";
  const paymentHelp = paymentStatus === "HELP_REQUESTED";

  const statusBanner = useMemo(() => {
    if (!detail) return null;
    if (detail.status === "REJECTED") return "Registramos el rechazo de la cotización. Si cambias de opinión, contacta a AXESSIA.";
    if (detail.quote?.expired || detail.quote?.status === "EXPIRED") return "Esta cotización ya no está vigente.";
    if (paymentPaid) return "Pago confirmado. El equipo AXESSIA continuará con la gestión de tu solicitud.";
    if (advancedWithoutPayment) return "Avanzaste sin pago inmediato. AXESSIA te contactará para coordinar los siguientes pasos.";
    if (quoteAccepted) return "Cotización aceptada. Puedes pagar ahora o avanzar sin pago si tu caso lo permite.";
    if (detail.canDecide) return "Revisa el detalle y decide si aceptas o rechazas esta cotización.";
    return null;
  }, [advancedWithoutPayment, detail, paymentPaid, quoteAccepted]);

  const confirmDecision = async () => {
    if (!confirmKind || isBusy) return;
    if (confirmKind === "reject" && !comment.trim()) {
      setRejectError("Indica el motivo antes de rechazar la cotización.");
      return;
    }
    try {
      setBusy(confirmKind);
      setFeedback("");
      setRejectError("");
      const result = await postAction({
        action: confirmKind,
        comment: comment.trim() || undefined,
      });
      setConfirmKind(null);
      setFeedback(confirmKind === "accept" ? "Tu aceptación fue registrada." : "Tu rechazo fue registrado.");
      setComment("");
      await loadDetail();
      if (result.message) setFeedback(result.message);
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "No fue posible registrar la decisión.");
    } finally {
      setBusy(null);
    }
  };

  const confirmAdvance = async () => {
    if (isBusy) return;
    try {
      setBusy("advance");
      setFeedback("");
      const result = await postAction({ action: "advance_without_payment" });
      setConfirmKind(null);
      setAdvancedWithoutPayment(true);
      setFeedback(result.message || "Registramos que deseas continuar sin pagar ahora.");
      await loadDetail();
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "No fue posible registrar el avance sin pago.");
    } finally {
      setBusy(null);
    }
  };

  const startPayment = async () => {
    if (isBusy) return;
    try {
      setBusy("start_payment");
      setFeedback("");
      const result = await postAction({ action: "start_payment" });
      if (result.checkoutUrl) {
        setFeedback("Redirigiendo al Web Checkout de Banchile Pagos…");
        window.location.href = result.checkoutUrl;
        return;
      }
      await loadDetail();
      setFeedback(result.message || "Proceso de pago iniciado. La solicitud no se marca como pagada hasta la confirmación real.");
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "No fue posible iniciar el pago.");
    } finally {
      setBusy(null);
    }
  };

  const confirmPayment = useCallback(async () => {
    try {
      setBusy("confirm_payment");
      setFeedback("Confirmando el resultado de tu pago con Banchile Pagos…");
      const result = await postAction({ action: "confirm_payment" });
      await loadDetail();
      setFeedback(result.message || "Resultado de pago verificado.");
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "No fue posible confirmar el resultado del pago.");
    } finally {
      setBusy(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only runs once for the returning payment redirect
  }, [requestNumber]);

  useEffect(() => {
    if (loading || new URLSearchParams(window.location.search).get("payment") !== "return") return;
    window.history.replaceState(null, "", `/seguimiento/${encodeURIComponent(requestNumber)}`);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- runs once to reconcile the payment after the bank redirect returns
    void confirmPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only trigger once when the return redirect is detected
  }, [loading]);

  const submitHelp = async () => {
    if (isBusy) return;
    if (!helpMessage.trim()) return setFeedback("Describe el problema con el pago para solicitar ayuda.");
    try {
      setBusy("help");
      setFeedback("");
      const result = await postAction({
        action: "payment_help",
        paymentId: detail?.payment?.id,
        message: helpMessage.trim(),
      });
      setShowHelp(false);
      setHelpMessage("");
      setFeedback(result.message || "Solicitud de ayuda enviada.");
      await loadDetail();
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "No fue posible solicitar ayuda.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-20 text-center text-[var(--text-secondary)]">
        <LoaderCircle className="mx-auto animate-spin" aria-label="Cargando" />
        <p className="mt-3 text-sm">Cargando tu cotización de forma segura…</p>
      </main>
    );
  }

  if (error || !detail) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-20 text-center">
        <CircleAlert className="mx-auto text-red-600" />
        <p className="mt-4 font-semibold text-[var(--navy)]">{error || "No fue posible cargar el seguimiento."}</p>
        <Link className="mt-6 inline-flex items-center gap-2 font-bold text-[var(--blue)]" href="/seguimiento">
          <ArrowLeft size={17} /> Volver al seguimiento
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
      <Link className="inline-flex items-center gap-2 text-sm font-bold text-[var(--blue)]" href="/seguimiento">
        <ArrowLeft size={17} /> Volver al seguimiento
      </Link>

      <motion.div className="mt-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <p className="eyebrow">Detalle protegido</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-[var(--navy)]">Solicitud {detail.requestNumber}</h1>
          <span className="rounded-full bg-[rgba(8,127,213,0.1)] px-3 py-2 text-sm font-bold text-[var(--blue)]">
            {labels[detail.status] || detail.status}
          </span>
        </div>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          {detail.requesterName} · Creada {date(detail.createdAt)} · Actualizada {date(detail.updatedAt)}
        </p>

        {statusBanner && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-[0_10px_28px_rgba(7,30,65,0.04)]">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--blue)]" />
            <p className="text-sm font-semibold text-[var(--navy)]">{statusBanner}</p>
          </div>
        )}

        {feedback && (
          <p className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-semibold text-[var(--navy)]" role="status">
            {feedback}
          </p>
        )}

        <section className="card-surface mt-8 rounded-2xl p-5 sm:p-8">
          <h2 className="text-xl font-bold text-[var(--navy)]">Lo que solicitaste</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-[var(--text-secondary)]">
                <tr>
                  <th className="pb-3">Medicamento</th>
                  <th className="pb-3">Principio activo</th>
                  <th className="pb-3">Concentración</th>
                  <th className="pb-3 text-right">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {detail.medications.map((item) => (
                  <tr className="border-t border-[var(--border)]" key={`${item.commercialName}-${item.concentration}`}>
                    <td className="py-3 font-semibold text-[var(--navy)]">{item.commercialName}</td>
                    <td className="py-3 text-[var(--text-secondary)]">{item.activeIngredient}</td>
                    <td className="py-3 text-[var(--text-secondary)]">{item.concentration}</td>
                    <td className="py-3 text-right text-[var(--text-secondary)]">{item.tabletQuantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {detail.quote ? (
          <section className="card-surface mt-6 rounded-2xl p-5 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Propuesta AXESSIA</p>
                <h2 className="mt-2 text-xl font-bold text-[var(--navy)]">
                  Cotización {detail.quote.quoteNumber || `versión ${detail.quote.version}`}
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Estado: {quoteLabels[detail.quote.status] || detail.quote.status}
                  {detail.quote.sentAt ? ` · Enviada ${date(detail.quote.sentAt)}` : ""}
                  {detail.quote.acceptedAt ? ` · Aceptada ${date(detail.quote.acceptedAt)}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {detail.quote.validUntil && (
                  <p className="rounded-full bg-[var(--background)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)]">
                    Vigente hasta {date(detail.quote.validUntil)}
                  </p>
                )}
                <a
                  href={`/api/tracking/quote-pdf?token=${encodeURIComponent(getToken(requestNumber) ?? "")}&quoteId=${encodeURIComponent(detail.quote.id)}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm font-bold text-[var(--navy)] transition hover:border-[var(--blue)]"
                >
                  <Download size={16} aria-hidden="true" /> Descargar cotización
                </a>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {detail.quote.items.map((item) => (
                <article key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold text-[var(--navy)]">{item.productName}</p>
                      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                        {item.activeIngredient || "Principio activo no informado"}
                        {item.concentration ? ` · ${item.concentration}` : ""}
                      </p>
                    </div>
                    <p className="text-sm font-extrabold text-[var(--navy)]">{money(item.totalPrice)}</p>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
                    <DetailField label="Forma farmacéutica" value={item.pharmaceuticalForm} />
                    <DetailField label="Presentación" value={item.presentation} />
                    <DetailField label="Unidades por presentación" value={item.unitsPerPackage ? String(item.unitsPerPackage) : null} />
                    <DetailField label="Laboratorio" value={item.manufacturer} />
                    <DetailField label="País de origen" value={item.originCountry} />
                    <DetailField label="País del proveedor" value={item.supplierCountry} />
                    <DetailField label="Registro sanitario" value={item.sanitaryRegistry} />
                    <DetailField label="Condición" value={item.condition ? conditionLabels[item.condition] : null} />
                    <DetailField label="Lote" value={item.batchNumber} />
                    <DetailField label="Vencimiento" value={item.expirationDate ? date(item.expirationDate) : null} />
                    <DetailField label="Cantidad" value={String(item.quantity)} />
                    <DetailField label="Precio unitario" value={money(item.unitPrice)} />
                  </dl>
                </article>
              ))}
            </div>

            <p className="mt-6 text-right text-2xl font-bold text-[var(--navy)]">Total: {money(detail.quote.total)}</p>

            {detail.canDecide && (
              <div className="mt-8 flex flex-wrap gap-3 border-t border-[var(--border)] pt-6">
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
            )}

            {quoteAccepted && (
              <div className="mt-8 space-y-4 border-t border-[var(--border)] pt-6">
                <h3 className="text-lg font-bold text-[var(--navy)]">Siguiente paso</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  La cotización ya está aceptada. El estado de pago es independiente: iniciar un pago no marca la solicitud como pagada.
                </p>

                {detail.payment && (
                  <div
                    className={`rounded-xl border p-4 ${
                      paymentPaid
                        ? "border-emerald-200 bg-emerald-50"
                        : paymentFailed || paymentHelp
                          ? "border-amber-200 bg-amber-50"
                          : "border-[var(--border)] bg-[var(--background)]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-[var(--navy)]">
                        Pago: {paymentLabels[detail.payment.status] || detail.payment.status}
                      </p>
                      <p className="text-sm font-semibold text-[var(--navy)]">
                        {money(detail.payment.amount)} {detail.payment.currency}
                      </p>
                    </div>
                    {detail.payment.providerReference && (
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">Ref: {detail.payment.providerReference}</p>
                    )}
                    {detail.payment.failureReason && (
                      <p className="mt-2 text-sm font-semibold text-amber-800">{detail.payment.failureReason}</p>
                    )}
                    {detail.payment.helpMessage && (
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">Ayuda: {detail.payment.helpMessage}</p>
                    )}
                  </div>
                )}

                {!paymentPaid && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={startPayment}
                      className="brand-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {busy === "start_payment" ? <LoaderCircle className="animate-spin" size={16} /> : <CreditCard size={16} />}
                      {paymentFailed || paymentHelp ? "Reintentar pago" : "Pagar ahora"}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy || advancedWithoutPayment}
                      onClick={() => setConfirmKind("advance")}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-3 text-sm font-bold text-[var(--navy)] disabled:opacity-50"
                    >
                      Avanzar sin pago
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setShowHelp(true)}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--purple)] px-5 py-3 text-sm font-bold text-[var(--purple)] disabled:opacity-50"
                    >
                      <HelpCircle size={16} /> Solicitar ayuda por el pago
                    </button>
                  </div>
                )}

                {paymentPaid && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                    <CheckCircle2 size={18} /> Tu pago fue confirmado por la pasarela. No necesitas repetir esta operación.
                  </div>
                )}
              </div>
            )}
          </section>
        ) : (
          <section className="card-surface mt-6 rounded-2xl p-5 sm:p-8">
            <p className="text-sm font-semibold text-[var(--text-secondary)]">
              Aún no hay una cotización disponible para esta solicitud, o ya no está vigente para respuesta.
            </p>
          </section>
        )}

        <p className="mt-8 text-center text-sm text-[var(--text-secondary)]">
          ¿Quieres un seguimiento más simple?{" "}
          <Link className="font-bold text-[var(--blue)]" href="/registrarme">
            Crea tu cuenta AXESSIA
          </Link>
          . Es opcional.
        </p>
      </motion.div>

      <AnimatePresence>
        {confirmKind && (
          <Overlay
            title={
              confirmKind === "accept"
                ? "Confirmar aceptación"
                : confirmKind === "reject"
                  ? "Confirmar rechazo"
                  : "Confirmar avance sin pago"
            }
            onClose={() => !isBusy && setConfirmKind(null)}
          >
            <p className="text-sm text-[var(--text-secondary)]">
              {confirmKind === "accept"
                ? "¿Confirmas que deseas aceptar esta cotización?"
                : confirmKind === "reject"
                  ? "¿Confirmas que deseas rechazar esta cotización? Se registrará el motivo y la fecha."
                  : "¿Confirmas que deseas continuar el proceso sin pagar ahora? AXESSIA coordinará contigo los siguientes pasos."}
            </p>
            {confirmKind === "reject" && (
              <div className="mt-4">
                <label className="block text-sm font-bold text-[var(--navy)]" htmlFor="reject-reason">
                  Motivo del rechazo
                </label>
                <textarea
                  id="reject-reason"
                  className="mt-2 min-h-24 w-full rounded-xl border border-[var(--border)] p-3 text-sm outline-none focus:border-[var(--blue)]"
                  value={comment}
                  onChange={(event) => { setComment(event.target.value); setRejectError(""); }}
                  placeholder="Cuéntanos por qué rechazas esta cotización"
                  disabled={isBusy}
                />
                {rejectError && <p className="mt-2 text-xs font-semibold text-rose-600">{rejectError}</p>}
              </div>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" disabled={isBusy} onClick={() => { setConfirmKind(null); setComment(""); setRejectError(""); }} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-bold text-[var(--navy)]">
                Cancelar
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  if (confirmKind === "advance") void confirmAdvance();
                  else void confirmDecision();
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--navy)] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {isBusy ? <LoaderCircle className="animate-spin" size={14} /> : null}
                Confirmar
              </button>
            </div>
          </Overlay>
        )}

        {showHelp && (
          <Overlay title="Solicitar ayuda con el pago" onClose={() => !isBusy && setShowHelp(false)}>
            <p className="text-sm text-[var(--text-secondary)]">
              Describe qué ocurrió con el pago. Mantendrás tu cotización aceptada y podrás reintentar mientras AXESSIA te ayuda.
            </p>
            <textarea
              className="mt-4 min-h-28 w-full rounded-xl border border-[var(--border)] p-3 text-sm outline-none focus:border-[var(--blue)]"
              value={helpMessage}
              onChange={(event) => setHelpMessage(event.target.value)}
              placeholder="Ej: La tarjeta fue rechazada / no pude completar el pago en la pasarela"
              disabled={isBusy}
            />
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" disabled={isBusy} onClick={() => setShowHelp(false)} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-bold text-[var(--navy)]">
                Cancelar
              </button>
              <button type="button" disabled={isBusy || !helpMessage.trim()} onClick={() => void submitHelp()} className="inline-flex items-center gap-2 rounded-xl bg-[var(--navy)] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                {busy === "help" ? <LoaderCircle className="animate-spin" size={14} /> : <AlertTriangle size={14} />}
                Enviar solicitud de ayuda
              </button>
            </div>
          </Overlay>
        )}
      </AnimatePresence>
    </main>
  );
}

function DetailField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">{label}</dt>
      <dd className="mt-0.5 truncate text-xs font-semibold text-[var(--navy)]">{value || "No informado"}</dd>
    </div>
  );
}

function Overlay({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--navy-dark)]/55 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-[0_20px_60px_rgba(7,30,65,0.25)]"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-base font-extrabold text-[var(--navy)]">{title}</h3>
          <button type="button" onClick={onClose} className="text-xs font-bold text-[var(--text-secondary)]">
            Cerrar
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
