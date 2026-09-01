"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "../components/Modal";
import { PrimaryButton, SecondaryButton } from "../components/Buttons";

type Form = { firstName: string; lastName: string; email: string; phone: string; rut: string; city: string };
const initialForm: Form = { firstName: "", lastName: "", email: "", phone: "", rut: "", city: "" };
const labels: Record<keyof Form, string> = { firstName: "Nombre", lastName: "Apellido", email: "Correo", phone: "Teléfono", rut: "RUT", city: "Ciudad" };

export default function CreateCustomerModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<Form>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (isSubmitting) return;
    if (Object.values(form).some((value) => !value.trim())) {
      setError("Completa todos los campos obligatorios.");
      return;
    }
    try {
      setIsSubmitting(true);
      setError("");
      const response = await fetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ internal: true, name: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone, rut: form.rut, city: form.city }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "No fue posible crear el cliente.");
      setForm(initialForm);
      onCreated();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No fue posible crear el cliente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return <Modal open={open} onClose={() => !isSubmitting && onClose()} dismissible={false} title="Nuevo cliente" description="Registra un cliente para gestionar sus solicitudes y cotizaciones." maxWidthClassName="max-w-xl" footer={<div className="flex justify-end gap-2"><SecondaryButton size="sm" onClick={onClose} disabled={isSubmitting}>Cancelar</SecondaryButton><PrimaryButton size="sm" onClick={() => void submit()} disabled={isSubmitting} icon={isSubmitting ? Loader2 : undefined} className={isSubmitting ? "[&_svg]:animate-spin" : ""}>{isSubmitting ? "Creando..." : "Crear cliente"}</PrimaryButton></div>}>
    <div className="grid gap-4 sm:grid-cols-2">{(Object.keys(form) as Array<keyof Form>).map((field) => <label key={field} className="text-xs font-bold text-[var(--navy)]">{labels[field]}<input value={form[field]} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} type={field === "email" ? "email" : "text"} className="field-input mt-2" /></label>)}</div>
    {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}
  </Modal>;
}