"use client";

import { Loader2 } from "lucide-react";
import Modal from "../components/Modal";
import { SecondaryButton } from "../components/Buttons";

export default function DeleteSupplierModal({
  open,
  supplierName,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  supplierName: string;
  isSubmitting: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={() => !isSubmitting && onClose()}
      dismissible={false}
      title="Eliminar proveedor"
      description="Esta acción no se puede deshacer."
      maxWidthClassName="max-w-md"
      footer={
        <div className="flex justify-end gap-2">
          <SecondaryButton size="sm" onClick={onClose} disabled={isSubmitting}>Cancelar</SecondaryButton>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 text-xs font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {isSubmitting ? "Eliminando..." : "Eliminar proveedor"}
          </button>
        </div>
      }
    >
      <p className="text-sm text-[var(--text-secondary)]">
        ¿Confirmas que quieres eliminar a <strong className="text-[var(--navy)]">{supplierName}</strong>? Si más adelante el proveedor queda asociado a compras, cotizaciones u otras gestiones, la eliminación se bloqueará para proteger la integridad de los datos.
      </p>
      {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}
    </Modal>
  );
}
