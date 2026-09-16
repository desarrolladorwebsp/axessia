"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, KeyRound } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";

type ResetStatus = "loading" | "valid" | "invalid" | "success";

export default function ResetPasswordView() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [status, setStatus] = useState<ResetStatus>("loading");
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      setError("El enlace de recuperación no es válido. Solicita uno nuevo desde el inicio de sesión.");
      return;
    }

    const validateToken = async () => {
      try {
        const response = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
        const result = (await response.json()) as { valid?: boolean; error?: string };

        if (!response.ok || !result.valid) {
          setStatus("invalid");
          setError(result.error ?? "El enlace de recuperación no es válido.");
          return;
        }

        setStatus("valid");
      } catch {
        setStatus("invalid");
        setError("No fue posible validar el enlace de recuperación.");
      }
    };

    void validateToken();
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!password.trim() || !confirmPassword.trim()) {
      setError("Completa todos los campos obligatorios.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      setError("Usa al menos 8 caracteres, una mayúscula, una minúscula y un número.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const result = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "No fue posible restablecer la contraseña.");
      }

      setStatus("success");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "No fue posible restablecer la contraseña.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <main className="login-page">
        <section className="login-surface" aria-live="polite">
          <div className="login-header">
            <p className="eyebrow">Recuperación de acceso</p>
            <h1>Validando enlace...</h1>
            <p>Estamos comprobando tu solicitud de restablecimiento.</p>
          </div>
        </section>
      </main>
    );
  }

  if (status === "invalid") {
    return (
      <main className="login-page">
        <motion.section
          className="login-surface"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          aria-live="polite"
        >
          <div className="login-header">
            <p className="eyebrow">Recuperación de acceso</p>
            <h1>Enlace no disponible.</h1>
            <p>{error}</p>
          </div>
          <Link href="/ingresar" className="login-submit">
            Volver a ingresar
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </motion.section>
      </main>
    );
  }

  if (status === "success") {
    return (
      <main className="login-page">
        <motion.section
          className="login-surface"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          aria-live="polite"
        >
          <div className="login-header">
            <p className="eyebrow">Recuperación de acceso</p>
            <h1>Contraseña actualizada.</h1>
            <p>Tu contraseña fue restablecida correctamente. Ya puedes iniciar sesión con tus nuevas credenciales.</p>
          </div>
          <p className="register-message register-message-success">
            <Check size={16} aria-hidden="true" />
            Cambio realizado con éxito.
          </p>
          <Link href="/ingresar" className="login-submit">
            Ir a ingresar
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </motion.section>
      </main>
    );
  }

  return (
    <main className="login-page">
      <motion.section
        className="login-surface"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        aria-labelledby="reset-password-title"
      >
        <div className="login-header">
          <p className="eyebrow">Recuperación de acceso</p>
          <h1 id="reset-password-title">Crea una nueva contraseña.</h1>
          <p>Ingresa y confirma tu nueva contraseña para recuperar el acceso a tu cuenta.</p>
        </div>

        <motion.form
          className="login-form"
          onSubmit={handleSubmit}
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          <motion.label
            className="login-field"
            htmlFor="reset-password"
            variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
          >
            <span>Nueva contraseña</span>
            <PasswordInput
              id="reset-password"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              visible={showPassword}
              onToggleVisibility={() => setShowPassword((visible) => !visible)}
            />
          </motion.label>

          <motion.label
            className="login-field"
            htmlFor="reset-confirm-password"
            variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
          >
            <span>Confirmar contraseña</span>
            <PasswordInput
              id="reset-confirm-password"
              placeholder="Repite tu contraseña"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              visible={showConfirm}
              onToggleVisibility={() => setShowConfirm((visible) => !visible)}
              revealLabel="Mostrar confirmación de contraseña"
              hideLabel="Ocultar confirmación de contraseña"
            />
          </motion.label>

          <p className="register-password-help">Usa una mayúscula, una minúscula y un número.</p>

          {error && <p className="register-message register-message-error">{error}</p>}

          <button type="submit" className="login-submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Restablecer contraseña"}
            <KeyRound size={18} aria-hidden="true" />
          </button>
        </motion.form>

        <Link href="/ingresar" className="register-back">
          <ArrowLeft size={16} aria-hidden="true" />
          Volver a ingresar
        </Link>
      </motion.section>
    </main>
  );
}
