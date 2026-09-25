"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import Modal from "../components/Modal";
import { PrimaryButton, SecondaryButton } from "../components/Buttons";

export type DirectQuoteCustomer = {
  name: string;
  email: string;
  rut: string;
  phone: string;
  city: string;
};

const emptyCustomer: DirectQuoteCustomer = {
  name: "",
  email: "",
  rut: "",
  phone: "",
  city: "",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
      {label}<span className="ml-0.5 text-rose-600" aria-hidden="true">*</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export default function DirectQuoteCustomerModal({
  open,
  onClose,
  onContinue,
}: {
  open: boolean;
  onClose: () => void;
  onContinue: (customer: DirectQuoteCustomer) => void;
}) {
  const [customer, setCustomer] = useState<DirectQuoteCustomer>(emptyCustomer);
  const [error, setError] = useState("");

  const update = (field: keyof DirectQuoteCustomer, value: string) => {
    setCustomer((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const continueToQuote = () => {
    const normalized = Object.fromEntries(
      Object.entries(customer).map(([key, value]) => [key, value.trim()]),
    ) as DirectQuoteCustomer;
    if (Object.values(normalized).some((value) => !value)) {
      setError("Completa todos los datos del cliente para continuar.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(normalized.email)) {
      setError("Revisa el formato del correo electrónico.");
      return;
    }
    onContinue(normalized);
  };

  const close = () => {
    setCustomer(emptyCustomer);
    setError("");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Nueva cotización directa"
      description="Identifica al cliente. La cotización se creará sin una solicitud previa."
      maxWidthClassName="max-w-2xl"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <SecondaryButton onClick={close}>Cancelar</SecondaryButton>
          <PrimaryButton onClick={continueToQuote} icon={ArrowRight}>Continuar a productos</PrimaryButton>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre completo">
          <input value={customer.name} onChange={(event) => update("name", event.target.value)} autoComplete="name" className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--navy)] outline-none focus:border-[var(--blue)]" />
        </Field>
        <Field label="RUT">
          <input value={customer.rut} onChange={(event) => update("rut", event.target.value)} placeholder="12.345.678-9" autoComplete="off" className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--navy)] outline-none focus:border-[var(--blue)]" />
        </Field>
        <Field label="Correo electrónico">
          <input type="email" value={customer.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--navy)] outline-none focus:border-[var(--blue)]" />
        </Field>
        <Field label="Teléfono">
          <input type="tel" value={customer.phone} onChange={(event) => update("phone", event.target.value)} autoComplete="tel" className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--navy)] outline-none focus:border-[var(--blue)]" />
        </Field>
        <Field label="Ciudad">
          <input value={customer.city} onChange={(event) => update("city", event.target.value)} autoComplete="address-level2" className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--navy)] outline-none focus:border-[var(--blue)]" />
        </Field>
      </div>
      {error && <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" role="alert">{error}</p>}
      <p className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-xs leading-relaxed text-[var(--text-secondary)]">
        Si el correo y el RUT ya pertenecen al mismo cliente, se reutilizará su ficha. No se creará ningún registro hasta guardar la cotización.
      </p>
    </Modal>
  );
}
