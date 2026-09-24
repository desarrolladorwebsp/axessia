"use client";

import Modal from "../components/Modal";
import { PrimaryButton, SecondaryButton } from "../components/Buttons";
import type { SupplierQuote, SupplierRecord } from "./types";
import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--navy)]">{value?.trim() ? value : "—"}</p>
    </div>
  );
}

export default function SupplierDetailModal({
  open,
  supplier,
  onClose,
  onEdit,
  onDelete,
}: {
  open: boolean;
  supplier: SupplierRecord | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [quotes, setQuotes] = useState<SupplierQuote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState("");

  useEffect(() => {
    if (!open || !supplier) return;
    setQuotesLoading(true);
    setQuotesError("");
    void fetch(`/api/suppliers/${supplier.id}/quotes`)
      .then(async (response) => { const result = await response.json() as { quotes?: SupplierQuote[]; error?: string }; if (!response.ok) throw new Error(result.error || "No fue posible cargar las cotizaciones."); setQuotes(result.quotes ?? []); })
      .catch((error) => setQuotesError(error instanceof Error ? error.message : "No fue posible cargar las cotizaciones."))
      .finally(() => setQuotesLoading(false));
  }, [open, supplier]);

  const accepted = quotes.filter((quote) => quote.saleStatus === "ACEPTADA").length;
  const sold = quotes.filter((quote) => quote.saleStatus === "VENDIDA").length;
  const pending = quotes.filter((quote) => quote.saleStatus === "PENDIENTE").length;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={supplier?.name || "Proveedor"}
      description="Ficha completa del proveedor"
      maxWidthClassName="max-w-4xl"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <SecondaryButton size="sm" onClick={onDelete}>Eliminar</SecondaryButton>
          <PrimaryButton size="sm" onClick={onEdit}>Editar</PrimaryButton>
        </div>
      }
    >
      {supplier && (
        <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" value={supplier.name} />
          <Field label="Número / ID" value={supplier.identifier} />
          <Field label="Persona responsable" value={supplier.contactName} />
          <Field label="Teléfono" value={supplier.phone} />
          <Field label="Correo electrónico" value={supplier.email} />
          <Field label="Laboratorio / fabricante" value={supplier.manufacturer} />
          <Field label="País de origen" value={supplier.originCountry} />
          <Field label="País del proveedor" value={supplier.country} />
          <Field label="Creado" value={formatDate(supplier.createdAt)} />
          <Field label="Última actualización" value={formatDate(supplier.updatedAt)} />
          <div className="sm:col-span-2">
            <Field label="Observaciones" value={supplier.notes} />
          </div>
        </div>
        <div className="border-t border-[var(--border)] pt-5">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="font-display text-lg font-extrabold text-[var(--navy)]">Cotizaciones asociadas</h3><p className="mt-1 text-xs text-[var(--text-secondary)]">Productos relacionados con este proveedor.</p></div><div className="flex gap-2 text-[10px] font-bold"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Vendidas: {sold}</span><span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">Aceptadas: {accepted}</span><span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">Pendientes: {pending}</span></div></div>
          {quotesLoading && <div className="flex items-center gap-2 py-6 text-xs text-[var(--text-secondary)]"><LoaderCircle className="h-4 w-4 animate-spin" />Cargando cotizaciones…</div>}
          {quotesError && <p className="py-5 text-xs font-semibold text-red-600">{quotesError}</p>}
          {!quotesLoading && !quotesError && quotes.length === 0 && <p className="py-5 text-xs text-[var(--text-secondary)]">No hay cotizaciones asociadas a este proveedor.</p>}
          {!quotesLoading && quotes.length > 0 && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="bg-[var(--background)] text-[var(--text-secondary)]"><tr>{["Cotización", "Solicitud", "Cliente", "Producto", "Cantidad", "Total", "Estado"].map((header) => <th key={header} className="px-3 py-2 font-bold">{header}</th>)}</tr></thead><tbody>{quotes.map((quote, index) => <tr key={`${quote.id}-${index}`} className="border-t border-[var(--border)]"><td className="px-3 py-2 font-bold text-[var(--blue)]">{quote.quoteNumber ?? "—"}</td><td className="px-3 py-2">{quote.requestNumber ?? "—"}</td><td className="px-3 py-2">{quote.customerName}</td><td className="px-3 py-2">{quote.productName}</td><td className="px-3 py-2">{quote.quantity}</td><td className="px-3 py-2">{quote.totalPrice ?? "—"}</td><td className="px-3 py-2 font-bold">{quote.saleStatus}</td></tr>)}</tbody></table></div>}
        </div>
        </div>
      )}
    </Modal>
  );
}
