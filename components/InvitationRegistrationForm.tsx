"use client";

import { ChangeEvent, FormEvent, useState } from "react";

interface InvitationRegistrationFormProps {
  token: string;
  invitation: {
    email: string;
    rut: string;
    role: "EJECUTIVO" | "ADMINISTRADOR";
  };
}

export default function InvitationRegistrationForm({ token, invitation }: InvitationRegistrationFormProps) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ firstName: string } | null>(null);
  const [avatar, setAvatar] = useState<File | null>(null);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setAvatar(event.target.files?.[0] ?? null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("token", token);
    formData.append("firstName", form.firstName);
    formData.append("lastName", form.lastName);
    formData.append("phone", form.phone);
    formData.append("email", invitation.email);
    formData.append("rut", invitation.rut);
    formData.append("password", form.password);
    formData.append("confirmPassword", form.confirmPassword);
    if (avatar) formData.append("avatar", avatar);

    try {
      const response = await fetch("/api/users/register", { method: "POST", body: formData });
      const result = (await response.json()) as { error?: string; user?: { firstName: string } };

      if (!response.ok) {
        throw new Error(result.error || "No fue posible completar el registro.");
      }

      setSuccess({ firstName: result.user?.firstName || form.firstName });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "No fue posible completar el registro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10">
        <section className="w-full max-w-xl rounded-3xl border border-[var(--border)] bg-white p-8 text-center shadow-[0_16px_40px_rgba(7,30,65,0.08)]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl">✅</div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--navy)]">Bienvenido a AXESSIA, {success.firstName}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Tu cuenta interna ya quedó creada correctamente. Ahora puedes ingresar al sistema con tus credenciales.</p>
          <a href="/ingresar" className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--navy)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--navy-dark)]">Ingresar al sistema</a>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10">
      <section className="w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-white p-8 shadow-[0_16px_40px_rgba(7,30,65,0.08)]">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--purple)]">Registro interno</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--navy)]">Completa tu registro</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">La invitación fue emitida para el rol {invitation.role === "ADMINISTRADOR" ? "Administrador" : "Ejecutivo"}.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" encType="multipart/form-data">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-medium text-[var(--navy)]">
              Nombre
              <input
                className="mt-2 w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm outline-none focus:border-[var(--blue)]"
                value={form.firstName}
                onChange={(event) => updateField("firstName", event.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium text-[var(--navy)]">
              Apellido
              <input
                className="mt-2 w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm outline-none focus:border-[var(--blue)]"
                value={form.lastName}
                onChange={(event) => updateField("lastName", event.target.value)}
                required
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-medium text-[var(--navy)]">
              Teléfono
              <input
                className="mt-2 w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm outline-none focus:border-[var(--blue)]"
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium text-[var(--navy)]">
              Correo electrónico
              <input value={invitation.email} readOnly className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--text-secondary)]" />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-medium text-[var(--navy)]">
              RUT
              <input value={invitation.rut} readOnly className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--text-secondary)]" />
            </label>
            <label className="block text-sm font-medium text-[var(--navy)]">
              Rol
              <input value={invitation.role === "ADMINISTRADOR" ? "Administrador" : "Ejecutivo"} readOnly className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--text-secondary)]" />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-medium text-[var(--navy)]">
              Contraseña
              <input
                type="password"
                className="mt-2 w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm outline-none focus:border-[var(--blue)]"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium text-[var(--navy)]">
              Confirmación de contraseña
              <input
                type="password"
                className="mt-2 w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm outline-none focus:border-[var(--blue)]"
                value={form.confirmPassword}
                onChange={(event) => updateField("confirmPassword", event.target.value)}
                required
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-[var(--navy)]">
            Foto de perfil opcional
            <input type="file" accept="image/*" onChange={handleFileChange} className="mt-2 block w-full text-sm text-[var(--text-secondary)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--navy)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white" />
          </label>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center rounded-full bg-[var(--navy)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--navy-dark)] disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? "Creando usuario..." : "Completar registro"}
          </button>
        </form>
      </section>
    </main>
  );
}
