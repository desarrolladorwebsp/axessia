"use client";

import { useState } from "react";
import { AlertTriangle, Pencil, Send } from "lucide-react";
import Modal from "../../components/Modal";
import { PrimaryButton, SecondaryButton } from "../../components/Buttons";
import StatusBadge, { type StatusTone } from "../../components/StatusBadge";

export type QuoteItemDetail = {
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

export type QuoteDetail = {
  id: string;
  quoteNumber: string | null;
  version: number;
  status: string;
  total: string | number | null;
  validUntil: string | null;
  createdAt: string;
  items: QuoteItemDetail[];
};

export const quoteStatusLabels: Record<string, string> = { DRAFT: "Borrador", READY: "Lista para enviar", SENT: "Enviada", ACCEPTED: "Aceptada", REJECTED: "Rechazada", EXPIRED: "Vencida", VOIDED: "Anulada" };
export const quoteStatusTones: Record<string, StatusTone> = { DRAFT: "neutral", READY: "warning", SENT: "info", ACCEPTED: "success", REJECTED: "danger", EXPIRED: "warning", VOIDED: "neutral" };
const conditionLabels: Record<string, string> = { AVAILABLE: "Medicamento disponible", SPECIAL_IMPORT: "Importación especial" };
const editableStatuses = ["DRAFT", "READY"];

function money(value: string | number | null) {
  if (value === null || value === undefined) return "-";
  return `$${Number(value).toLocaleString("es-CL")}`;
}

export default function ViewQuoteModal({
  open,
  onClose,
  quote,
  customerName,
  onEdit,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  quote: QuoteDetail | null;
  customerName: string;
  onEdit: (quote: QuoteDetail) => void;
  onSent: (quote: QuoteDetail) => void;
}) {
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");

  if (!quote) return null;

  const canEditOrSend = editableStatuses.includes(quote.status);

  const sendQuote = async () => {
    if (isSending) return;
    try {
      setIsSending(true);
      setSendError("");
      const response = await fetch(`/api/quotes/${quote.id}/send`, { method: "POST" });
      const result = (await response.json()) as { error?: string } & Partial<QuoteDetail>;
      if (!response.ok) throw new Error(result.error || "No fue posible enviar la cotización al cliente");
      onSent(result as QuoteDetail);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "No fue posible enviar la cotización al cliente");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={quote.quoteNumber || `Borrador v${quote.version}`}
      description={`Cliente: ${customerName} · Emitida el ${new Date(quote.createdAt).toLocaleDateString("es-CL", { dateStyle: "long" })}`}
      maxWidthClassName="max-w-5xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-secondary)]">
            {quote.validUntil ? `Vigente hasta ${new Date(quote.validUntil).toLocaleDateString("es-CL")}` : "Sin fecha de vigencia"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {sendError && <p className="text-xs font-semibold text-rose-600">{sendError}</p>}
            <p className="text-sm font-extrabold text-[var(--navy)]">Total: {money(quote.total)}</p>
            {canEditOrSend && (
              <>
                <SecondaryButton size="sm" icon={Pencil} onClick={() => onEdit(quote)} disabled={isSending}>Editar</SecondaryButton>
                <PrimaryButton size="sm" icon={Send} onClick={sendQuote} disabled={isSending}>
                  {isSending ? "Enviando..." : "Enviar al cliente"}
                </PrimaryButton>
              </>
            )}
          </div>
        </div>
      }
    >
      {sendError && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs font-semibold text-amber-700">{sendError} Puedes reintentar el envío.</p>
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge label={quoteStatusLabels[quote.status] || quote.status} tone={quoteStatusTones[quote.status]} />
        <span className="text-xs text-[var(--text-secondary)]">{quote.items.length} producto{quote.items.length === 1 ? "" : "s"}</span>
      </div>

      <div className="space-y-3">
        {quote.items.map((item) => (
          <article key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-[var(--navy)]">{item.productName}</p>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{item.activeIngredient || "Principio activo no informado"} {item.concentration ? `· ${item.concentration}` : ""}</p>
              </div>
              <p className="text-sm font-extrabold text-[var(--navy)]">{money(item.totalPrice)}</p>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
              <DetailField label="Forma farmacéutica" value={item.pharmaceuticalForm} />
              <DetailField label="Presentación" value={item.presentation} />
              <DetailField label="Unidades por presentación" value={item.unitsPerPackage ? String(item.unitsPerPackage) : null} />
              <DetailField label="Laboratorio / fabricante" value={item.manufacturer} />
              <DetailField label="País de origen" value={item.originCountry} />
              <DetailField label="País del proveedor" value={item.supplierCountry} />
              <DetailField label="Registro sanitario" value={item.sanitaryRegistry} />
              <DetailField label="Condición" value={item.condition ? conditionLabels[item.condition] : null} />
              <DetailField label="Lote" value={item.batchNumber} />
              <DetailField label="Fecha de vencimiento" value={item.expirationDate ? new Date(item.expirationDate).toLocaleDateString("es-CL") : null} />
              <DetailField label="Cantidad solicitada" value={String(item.quantity)} />
              <DetailField label="Precio unitario" value={money(item.unitPrice)} />
            </dl>
          </article>
        ))}
      </div>
    </Modal>
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
