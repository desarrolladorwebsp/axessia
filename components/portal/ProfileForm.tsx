"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { parsePortalProfileUpdate } from "@/lib/portal/profile";

type ProfileFormProps = {
  name: string;
  email: string;
  rut: string;
  phone: string;
  city: string;
  promotionsConsent: boolean;
};

export default function ProfileForm({ name, email, rut, phone, city, promotionsConsent }: ProfileFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({ name, phone, city, promotionsConsent });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      parsePortalProfileUpdate(form);
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : "Revisa los datos ingresados.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/portal/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "No fue posible actualizar el perfil.");
      setSuccess("Tus datos fueron actualizados.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No fue posible actualizar el perfil.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="card-surface space-y-5 rounded-2xl p-5 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-bold text-[var(--navy)]">
          Nombre
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            className="portal-input mt-2"
            autoComplete="name"
            required
          />
        </label>
        <label className="text-xs font-bold text-[var(--navy)]">
          Teléfono
          <input
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            className="portal-input mt-2"
            autoComplete="tel"
            required
          />
        </label>
        <label className="text-xs font-bold text-[var(--navy)]">
          Ciudad
          <input
            value={form.city}
            onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
            className="portal-input mt-2"
            autoComplete="address-level2"
            required
          />
        </label>
        <label className="text-xs font-bold text-[var(--navy)]">
          Correo
          <input value={email} className="portal-input mt-2 cursor-not-allowed bg-[var(--background)]" disabled readOnly />
        </label>
        <label className="text-xs font-bold text-[var(--navy)] sm:col-span-2">
          RUT
          <input value={rut} className="portal-input mt-2 cursor-not-allowed bg-[var(--background)]" disabled readOnly />
        </label>
      </div>
      <p className="text-xs text-[var(--text-secondary)]">El correo y el RUT identifican tu cuenta y no se pueden cambiar desde el portal.</p>
      <label className="flex items-start gap-3 text-sm text-[var(--navy)]">
        <input
          type="checkbox"
          checked={form.promotionsConsent}
          onChange={(event) => setForm((current) => ({ ...current, promotionsConsent: event.target.checked }))}
          className="mt-1"
        />
        Deseo recibir información y novedades de AXESSIA.
      </label>
      {error ? <p className="text-sm font-semibold text-rose-600" role="alert">{error}</p> : null}
      {success ? <p className="text-sm font-semibold text-emerald-700" role="status">{success}</p> : null}
      <button type="submit" disabled={busy} className="brand-gradient inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-bold text-white disabled:opacity-50">
        {busy ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
