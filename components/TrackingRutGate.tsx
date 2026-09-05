"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, Search } from "lucide-react";

import { isValidRut } from "@/lib/customer-validation";
import { trackingStorageKey } from "@/lib/tracking-normalization";

const sanitizeRutInput = (value: string) => value.replace(/[^0-9kK.\-\s]/g, "");

type Props = {
  requestNumber: string;
  onVerified: () => void | Promise<void>;
};

export default function TrackingRutGate({ requestNumber, onVerified }: Props) {
  const [rut, setRut] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!rut.trim()) return setError("Ingresa el RUT asociado a la solicitud.");
    if (!isValidRut(rut)) return setError("Ingresa un RUT válido.");

    setLoading(true);
    setError("");

    try {
      const verify = await fetch("/api/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestNumber, rut }),
      });

      if (!verify.ok) {
        throw new Error("No pudimos validar esos datos. Revisa tu número de solicitud y RUT.");
      }

      const { token, requestNumber: canonicalRequestNumber } = (await verify.json()) as {
        token: string;
        requestNumber: string;
      };

      sessionStorage.setItem(trackingStorageKey(canonicalRequestNumber), token);
      await onVerified();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible validar la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-5 py-16 sm:py-20">
      <Link className="inline-flex items-center gap-2 text-sm font-bold text-[var(--blue)]" href="/seguimiento">
        <ArrowLeft size={17} /> Volver al seguimiento
      </Link>

      <div className="card-surface mt-8 rounded-2xl p-6 sm:p-8">
        <p className="eyebrow">Acceso protegido</p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--navy)] sm:text-3xl">
          Solicitud {requestNumber}
        </h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          Para ver el detalle de tu solicitud, confirma el RUT con el que la registraste.
        </p>

        <form className="tracking-form mt-6" onSubmit={submit} noValidate>
          <label htmlFor="tracking-rut-gate">RUT asociado a la solicitud</label>
          <div className="tracking-input-row">
            <input
              id="tracking-rut-gate"
              value={rut}
              onChange={(event) => {
                setRut(sanitizeRutInput(event.target.value));
                setError("");
              }}
              placeholder="Ej: 12.345.678-9"
              autoComplete="off"
            />
            <button type="submit" disabled={loading}>
              <Search size={18} aria-hidden="true" />
              <span>{loading ? "Validando..." : "Ver solicitud"}</span>
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm font-semibold text-red-700" role="alert">
              {error}
            </p>
          )}
        </form>

        <p className="tracking-security mt-4">
          <LockKeyhole size={16} aria-hidden="true" /> Información 100% segura y confidencial.
        </p>
      </div>
    </main>
  );
}
