"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "../../components/Buttons";

export default function CreateUserPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    rut: "",
    role: "EJECUTIVO",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al crear usuario");
      }

      router.push("/app/usuarios?success=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-1 py-2 sm:px-2 lg:px-4">
      <SecondaryButton href="/app/usuarios" icon={ArrowLeft} size="sm" className="mb-6 border-none px-0 text-[var(--blue)] hover:text-[var(--navy)]">
        Volver
      </SecondaryButton>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[0_10px_30px_rgba(7,30,65,0.05)] sm:p-8"
      >
        <div className="mb-8 flex items-start gap-3">
          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[var(--purple)] text-[var(--purple)]">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--purple)]">Administración</p>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-[var(--navy)]">
              Crear usuario interno
            </h1>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Agrega un nuevo usuario al sistema de gestión
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="mb-2 block text-xs font-bold text-[var(--navy)]">
                Nombre
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                placeholder="Juan"
                className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm outline-none transition focus:border-[var(--blue)] focus:ring-4 focus:ring-[var(--blue)]/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-[var(--navy)]">
                Apellido
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                placeholder="Pérez"
                className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm outline-none transition focus:border-[var(--blue)] focus:ring-4 focus:ring-[var(--blue)]/10"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold text-[var(--navy)]">
              Correo electrónico
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="juan@example.com"
              className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm outline-none transition focus:border-[var(--blue)] focus:ring-4 focus:ring-[var(--blue)]/10"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold text-[var(--navy)]">
              RUT
            </label>
            <input
              type="text"
              name="rut"
              value={formData.rut}
              onChange={handleChange}
              required
              placeholder="12.345.678-K"
              className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm outline-none transition focus:border-[var(--blue)] focus:ring-4 focus:ring-[var(--blue)]/10"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold text-[var(--navy)]">
              Rol
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm outline-none transition focus:border-[var(--blue)] focus:ring-4 focus:ring-[var(--blue)]/10"
            >
              <option value="EJECUTIVO">Ejecutivo</option>
              <option value="ADMINISTRADOR">Administrador</option>
            </select>
          </div>

          <div className="flex gap-4 border-t border-[var(--border)] pt-6">
            <SecondaryButton type="button" onClick={() => router.back()} className="flex-1">
              Cancelar
            </SecondaryButton>

            <PrimaryButton type="submit" disabled={isLoading} icon={isLoading ? Loader2 : undefined} className={`flex-1 ${isLoading ? "[&_svg]:animate-spin" : ""}`}>
              {isLoading ? "Creando..." : "Crear usuario"}
            </PrimaryButton>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
