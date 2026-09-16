import { Download } from "lucide-react";
import QuoteActions from "@/components/portal/QuoteActions";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { formatDate, formatDateTime, formatMoney } from "@/components/portal/format";
import { isMedicalDevice, quoteConditionLabel } from "@/lib/product-type";
import { portalRequestDetailPath } from "@/lib/portal/paths";
import { formatEstimatedShippingDays } from "@/lib/quote-items";
import { quoteStatusLabel, QUOTE_STATUS_TONES } from "@/lib/quote-status";

type QuoteItem = {
  id: string;
  productType: string;
  productName: string;
  activeIngredient: string | null;
  concentration: string | null;
  brand: string | null;
  model: string | null;
  description: string | null;
  presentation: string | null;
  quantity: number;
  condition: string | null;
  unitPrice: string | null;
  totalPrice: string | null;
};

type PaymentSummary = {
  id: string;
  status: string;
  amount: string;
  currency: string;
  providerReference: string | null;
  failureReason: string | null;
  helpMessage: string | null;
};

export type PortalCurrentQuote = {
  id: string;
  quoteNumber: string | null;
  version: number;
  status: string;
  total: string | null;
  validUntil: string | null;
  estimatedShippingDays: number | null;
  sentAt: string | null;
  createdAt: string;
  items: QuoteItem[];
  canDecide: boolean;
  canPay: boolean;
  canAdvanceWithoutPayment: boolean;
  payment: PaymentSummary | null;
};

export function RequestQuoteSection({
  requestId,
  quote,
  confirmOnReturn = false,
}: {
  requestId: string;
  quote: PortalCurrentQuote | null;
  confirmOnReturn?: boolean;
}) {
  return (
    <section className="card-surface rounded-2xl p-5 sm:p-6">
      <h2 className="font-display text-lg font-extrabold text-[var(--navy)]">Cotización</h2>
      {!quote ? (
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          No hay una cotización disponible para esta solicitud.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-[var(--navy)]">
                {quote.quoteNumber || `Versión ${quote.version}`}
              </p>
              <p className="mt-1 text-2xl font-extrabold text-[var(--navy)]">{formatMoney(quote.total)}</p>
            </div>
            <StatusBadge label={quoteStatusLabel(quote.status)} tone={QUOTE_STATUS_TONES[quote.status]} />
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <Field label="Nº cotización" value={quote.quoteNumber || `Versión ${quote.version}`} />
            <Field label="Estado" value={quoteStatusLabel(quote.status)} />
            <Field label="Fecha de emisión" value={formatDate(quote.sentAt || quote.createdAt)} />
            <Field label="Fecha de vencimiento" value={quote.validUntil ? formatDateTime(quote.validUntil) : "Sin fecha de vencimiento"} />
          </dl>

          {formatEstimatedShippingDays(quote.estimatedShippingDays) ? (
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              Envío estimado: {formatEstimatedShippingDays(quote.estimatedShippingDays)}
            </p>
          ) : null}

          <div className="mt-5">
            <a
              href={`/api/portal/quotes/${quote.id}/pdf`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-xs font-bold text-[var(--navy)] transition hover:border-[var(--blue)] hover:text-[var(--blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Descargar PDF
            </a>
          </div>

          {quote.items.length > 0 ? (
            <div className="mt-6 space-y-3">
              {quote.items.map((item) => (
                <article key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold text-[var(--navy)]">{item.productName}</p>
                      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                        {isMedicalDevice(item.productType)
                          ? [item.brand, item.model].filter(Boolean).join(" · ") || item.description || "Dispositivo médico"
                          : `${item.activeIngredient || "Principio activo no informado"}${item.concentration ? ` · ${item.concentration}` : ""}`}
                      </p>
                    </div>
                    <p className="text-sm font-extrabold text-[var(--navy)]">{formatMoney(item.totalPrice)}</p>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                    <Field label="Cantidad" value={String(item.quantity)} />
                    <Field label="Precio unitario" value={formatMoney(item.unitPrice)} />
                    <Field label="Condición" value={quoteConditionLabel(item.condition, item.productType)} />
                    {!isMedicalDevice(item.productType)
                      ? <Field label="Presentación" value={item.presentation} />
                      : <Field label="Marca" value={item.brand} />}
                  </dl>
                </article>
              ))}
            </div>
          ) : null}

          <QuoteActions
            quoteId={quote.id}
            canDecide={quote.canDecide}
            canPay={quote.canPay}
            canAdvanceWithoutPayment={quote.canAdvanceWithoutPayment}
            payment={quote.payment}
            confirmOnReturn={confirmOnReturn}
            returnPath={portalRequestDetailPath(requestId)}
          />
        </>
      )}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-[var(--navy)]">{value || "No informado"}</dd>
    </div>
  );
}
