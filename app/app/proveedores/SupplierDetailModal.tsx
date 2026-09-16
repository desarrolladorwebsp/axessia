"use client";

import Modal from "../components/Modal";
import { PrimaryButton, SecondaryButton } from "../components/Buttons";
import type { SupplierRecord } from "./types";

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
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={supplier?.name || "Proveedor"}
      description="Ficha completa del proveedor"
      maxWidthClassName="max-w-xl"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <SecondaryButton size="sm" onClick={onDelete}>Eliminar</SecondaryButton>
          <PrimaryButton size="sm" onClick={onEdit}>Editar</PrimaryButton>
        </div>
      }
    >
      {supplier && (
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
      )}
    </Modal>
  );
}
