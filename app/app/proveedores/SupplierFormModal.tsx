"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "../components/Modal";
import { PrimaryButton, SecondaryButton } from "../components/Buttons";

export type SupplierFormValues = {
  name: string;
  identifier: string;
  phone: string;
  contactName: string;
  email: string;
  manufacturer: string;
  originCountry: string;
  country: string;
  notes: string;
};

export const emptySupplierForm: SupplierFormValues = {
  name: "",
  identifier: "",
  phone: "",
  contactName: "",
  email: "",
  manufacturer: "",
  originCountry: "",
  country: "",
  notes: "",
};

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

type FieldErrors = Partial<Record<keyof SupplierFormValues, string>>;

function validateForm(form: SupplierFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.name.trim()) errors.name = "El nombre del proveedor es obligatorio.";
  if (form.email.trim() && !EMAIL_PATTERN.test(form.email.trim())) {
    errors.email = "Revisa el formato del correo electrónico.";
  }
  if (form.notes.trim().length > 500) errors.notes = "Las observaciones no pueden superar 500 caracteres.";
  return errors;
}

export default function SupplierFormModal({
  open,
  mode,
  supplierId,
  initialValues,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "create" | "edit";
  supplierId?: string | null;
  initialValues?: SupplierFormValues | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [form, setForm] = useState<SupplierFormValues>(initialValues ?? emptySupplierForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof SupplierFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const submit = async () => {
    if (isSubmitting) return;
    const nextErrors = validateForm(form);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (mode === "edit" && !supplierId) {
      setError("No fue posible identificar el proveedor a editar.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      const response = await fetch(mode === "create" ? "/api/suppliers" : `/api/suppliers/${supplierId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "No fue posible guardar el proveedor.");
      onSaved(result.message || (mode === "create" ? "Proveedor registrado correctamente." : "Proveedor actualizado correctamente."));
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No fue posible guardar el proveedor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !isSubmitting && onClose()}
      dismissible={false}
      title={mode === "create" ? "Nuevo proveedor" : "Editar proveedor"}
      description={mode === "create" ? "Registra un proveedor para la operación de AXESSIA." : "Actualiza los datos del proveedor seleccionado."}
      maxWidthClassName="max-w-xl"
      footer={
        <div className="flex justify-end gap-2">
          <SecondaryButton size="sm" onClick={onClose} disabled={isSubmitting}>Cancelar</SecondaryButton>
          <PrimaryButton
            size="sm"
            onClick={() => void submit()}
            disabled={isSubmitting}
            icon={isSubmitting ? Loader2 : undefined}
            className={isSubmitting ? "[&_svg]:animate-spin" : ""}
          >
            {isSubmitting ? "Guardando..." : mode === "create" ? "Registrar proveedor" : "Guardar cambios"}
          </PrimaryButton>
        </div>
      }
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label htmlFor="supplier-name" className="text-xs font-bold text-[var(--navy)] sm:col-span-2">
          Nombre del proveedor
          <input
            id="supplier-name"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            className="field-input mt-2"
            autoComplete="organization"
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "supplier-name-error" : undefined}
            required
          />
          {fieldErrors.name && <span id="supplier-name-error" className="mt-1 block text-[10px] font-semibold text-rose-700">{fieldErrors.name}</span>}
        </label>
        <label htmlFor="supplier-identifier" className="text-xs font-bold text-[var(--navy)]">
          Número / ID
          <input
            id="supplier-identifier"
            value={form.identifier}
            onChange={(event) => updateField("identifier", event.target.value)}
            className="field-input mt-2"
            placeholder="ID extranjero o código interno"
          />
        </label>
        <label htmlFor="supplier-phone" className="text-xs font-bold text-[var(--navy)]">
          Teléfono
          <input
            id="supplier-phone"
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            className="field-input mt-2"
            type="tel"
            autoComplete="tel"
          />
        </label>
        <label htmlFor="supplier-contact" className="text-xs font-bold text-[var(--navy)]">
          Persona responsable
          <input
            id="supplier-contact"
            value={form.contactName}
            onChange={(event) => updateField("contactName", event.target.value)}
            className="field-input mt-2"
            autoComplete="name"
          />
        </label>
        <label htmlFor="supplier-email" className="text-xs font-bold text-[var(--navy)]">
          Correo electrónico
          <input
            id="supplier-email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            className="field-input mt-2"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "supplier-email-error" : undefined}
          />
          {fieldErrors.email && <span id="supplier-email-error" className="mt-1 block text-[10px] font-semibold text-rose-700">{fieldErrors.email}</span>}
        </label>
        <label htmlFor="supplier-manufacturer" className="text-xs font-bold text-[var(--navy)]">
          Laboratorio / fabricante
          <input
            id="supplier-manufacturer"
            value={form.manufacturer}
            onChange={(event) => updateField("manufacturer", event.target.value)}
            className="field-input mt-2"
          />
        </label>
        <label htmlFor="supplier-origin" className="text-xs font-bold text-[var(--navy)]">
          País de origen
          <input
            id="supplier-origin"
            value={form.originCountry}
            onChange={(event) => updateField("originCountry", event.target.value)}
            className="field-input mt-2"
          />
        </label>
        <label htmlFor="supplier-country" className="text-xs font-bold text-[var(--navy)]">
          País del proveedor
          <input
            id="supplier-country"
            value={form.country}
            onChange={(event) => updateField("country", event.target.value)}
            className="field-input mt-2"
          />
        </label>
        <label htmlFor="supplier-notes" className="text-xs font-bold text-[var(--navy)] sm:col-span-2">
          Observaciones
          <textarea
            id="supplier-notes"
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            className="field-input mt-2 min-h-20"
            maxLength={500}
            aria-invalid={Boolean(fieldErrors.notes)}
            aria-describedby={fieldErrors.notes ? "supplier-notes-error" : undefined}
          />
          {fieldErrors.notes && <span id="supplier-notes-error" className="mt-1 block text-[10px] font-semibold text-rose-700">{fieldErrors.notes}</span>}
        </label>
        <button type="submit" className="sr-only">Guardar</button>
      </form>
      {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}
    </Modal>
  );
}
