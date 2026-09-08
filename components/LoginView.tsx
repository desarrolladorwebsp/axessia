"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, LockKeyhole, UserRound } from "lucide-react";

type AccountType = "client" | "executive";
type ViewMode = "login" | "recovery";

export default function LoginView() {
  const [accountType, setAccountType] = useState<AccountType>("client");
  const [viewMode, setViewMode] = useState<ViewMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim() || !password.trim()) {
      setError("Ingresa tu correo y contraseña para continuar.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, accountType }),
      });
      const result = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "No fue posible iniciar sesión.");
      }

      window.location.href = accountType === "executive" ? "/app" : "/mi-cuenta";
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "No fue posible iniciar sesión.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecoverySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!recoveryEmail.trim()) {
      setError("Ingresa tu correo electrónico para continuar.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recoveryEmail }),
      });
      const result = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "No fue posible procesar la solicitud.");
      }

      setSuccess(result.message ?? "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "No fue posible procesar la solicitud.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRecovery = () => {
    setViewMode("recovery");
    setError("");
    setSuccess("");
    setRecoveryEmail(email);
  };

  const backToLogin = () => {
    setViewMode("login");
    setError("");
    setSuccess("");
  };

  const handleAccountTypeChange = (nextType: AccountType) => {
    setAccountType(nextType);
    if (nextType === "client" && viewMode === "recovery") {
      setViewMode("login");
      setError("");
      setSuccess("");
    }
  };

  return (
    <main className="login-page">
      <motion.section
        className="login-surface"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        aria-labelledby="login-title"
      >
        <div className="login-header">
          <p className="eyebrow">Acceso AXESSIA</p>
          <h1 id="login-title">
            {viewMode === "recovery" ? "Recupera tu contraseña." : "Ingresa a tu cuenta."}
          </h1>
          <p>
            {viewMode === "recovery"
              ? "Te enviaremos un enlace seguro a tu correo para restablecer el acceso a tu cuenta interna."
              : "Consulta tus solicitudes y mantén todo bajo control."}
          </p>
        </div>

        {viewMode === "login" && (
          <div className="account-switcher" role="group" aria-label="Tipo de cuenta">
            <button
              type="button"
              className={accountType === "client" ? "is-selected" : ""}
              onClick={() => handleAccountTypeChange("client")}
              aria-pressed={accountType === "client"}
            >
              <UserRound size={18} aria-hidden="true" />
              <span>Cliente</span>
            </button>
            <button
              type="button"
              className={accountType === "executive" ? "is-selected" : ""}
              onClick={() => handleAccountTypeChange("executive")}
              aria-pressed={accountType === "executive"}
            >
              <BriefcaseBusiness size={18} aria-hidden="true" />
              <span>Usuario interno</span>
            </button>
          </div>
        )}

        {viewMode === "login" ? (
          <motion.form
            className="login-form"
            onSubmit={handleLoginSubmit}
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          >
            <motion.label
              className="login-field"
              htmlFor="login-email"
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
            >
              <span>Correo electrónico</span>
              <input
                id="login-email"
                type="email"
                placeholder="Ej: ana@correo.cl"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </motion.label>
            <motion.label
              className="login-field"
              htmlFor="login-password"
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
            >
              <span>Contraseña</span>
              <input
                id="login-password"
                type="password"
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </motion.label>
            {accountType === "executive" && (
              <button type="button" className="login-recovery" onClick={openRecovery}>
                ¿Olvidaste tu contraseña?
              </button>
            )}
            {error && <p className="register-message register-message-error">{error}</p>}
            <button type="submit" className="login-submit" disabled={isSubmitting}>
              {isSubmitting ? "Ingresando..." : `Ingresar como ${accountType === "client" ? "cliente" : "usuario interno"}`}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </motion.form>
        ) : (
          <motion.form
            className="login-form"
            onSubmit={handleRecoverySubmit}
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          >
            <motion.label
              className="login-field"
              htmlFor="recovery-email"
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
            >
              <span>Correo electrónico</span>
              <input
                id="recovery-email"
                type="email"
                placeholder="Ej: ana@correo.cl"
                autoComplete="email"
                value={recoveryEmail}
                onChange={(event) => setRecoveryEmail(event.target.value)}
                required
              />
            </motion.label>
            <p className="login-notice">
              Si el correo está registrado como usuario interno, recibirás un enlace para restablecer tu contraseña.
            </p>
            {error && <p className="register-message register-message-error">{error}</p>}
            {success && (
              <p className="register-message register-message-success">
                <Check size={16} aria-hidden="true" />
                {success}
              </p>
            )}
            <button type="submit" className="login-submit" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar enlace de recuperación"}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <button type="button" className="register-back" onClick={backToLogin}>
              <ArrowLeft size={16} aria-hidden="true" />
              Volver a ingresar
            </button>
          </motion.form>
        )}

        {viewMode === "login" && (
          <>
            <div className="login-divider"><span>o</span></div>
            <Link href="/registrarme" className="login-create">
              <LockKeyhole size={17} aria-hidden="true" /> Registrarme como cliente
            </Link>
          </>
        )}
      </motion.section>
    </main>
  );
}
