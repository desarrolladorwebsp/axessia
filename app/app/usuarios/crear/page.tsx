"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";

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
    <div className="max-w-2xl mx-auto">
      <Link
        href="/app/usuarios"
        className="inline-flex items-center gap-2 text-[var(--blue)] hover:text-[var(--cyan)] font-medium mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-2xl border border-[var(--border)] p-8 shadow-sm"
      >
        <h1 className="text-2xl font-bold font-display text-[var(--navy)] mb-2">
          Crear Usuario Interno
        </h1>
        <p className="text-[var(--text-secondary)] mb-8">
          Agrega un nuevo usuario al sistema de gestión
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Nombres */}
          <div className="grid grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-medium text-[var(--navy)] mb-2">
                Nombre
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                placeholder="Juan"
                className="w-full px-4 py-3 rounded-lg border border-[var(--border)] focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue)]/20 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--navy)] mb-2">
                Apellido
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                placeholder="Pérez"
                className="w-full px-4 py-3 rounded-lg border border-[var(--border)] focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue)]/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[var(--navy)] mb-2">
              Correo Electrónico
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="juan@example.com"
              className="w-full px-4 py-3 rounded-lg border border-[var(--border)] focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue)]/20 outline-none transition-all"
            />
          </div>

          {/* RUT */}
          <div>
            <label className="block text-sm font-medium text-[var(--navy)] mb-2">
              RUT
            </label>
            <input
              type="text"
              name="rut"
              value={formData.rut}
              onChange={handleChange}
              required
              placeholder="12.345.678-K"
              className="w-full px-4 py-3 rounded-lg border border-[var(--border)] focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue)]/20 outline-none transition-all"
            />
          </div>

          {/* Rol */}
          <div>
            <label className="block text-sm font-medium text-[var(--navy)] mb-2">
              Rol
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-[var(--border)] focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue)]/20 outline-none transition-all"
            >
              <option value="EJECUTIVO">Ejecutivo</option>
              <option value="ADMINISTRADOR">Administrador</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 rounded-lg border border-[var(--border)] text-[var(--navy)] font-medium hover:bg-[var(--background)] transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-[var(--cyan)] to-[var(--blue)] text-white font-medium hover:shadow-[0_12px_28px_rgba(8,127,213,0.25)] transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? "Creando..." : "Crear Usuario"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
