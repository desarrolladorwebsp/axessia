"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BriefcaseBusiness, LockKeyhole, UserRound } from "lucide-react";

type AccountType = "client" | "executive";

export default function LoginView() {
  const [accountType, setAccountType] = useState<AccountType>("client");
  const [isReady, setIsReady] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsReady(true);
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
          <h1 id="login-title">Ingresa a tu cuenta.</h1>
          <p>Consulta tus solicitudes y mantén todo bajo control.</p>
        </div>

        <div className="account-switcher" role="group" aria-label="Tipo de cuenta">
          <button type="button" className={accountType === "client" ? "is-selected" : ""} onClick={() => setAccountType("client")} aria-pressed={accountType === "client"}>
            <UserRound size={18} aria-hidden="true" />
            <span>Cliente</span>
          </button>
          <button type="button" className={accountType === "executive" ? "is-selected" : ""} onClick={() => setAccountType("executive")} aria-pressed={accountType === "executive"}>
            <BriefcaseBusiness size={18} aria-hidden="true" />
            <span>Cliente ejecutivo</span>
          </button>
        </div>

        <motion.form className="login-form" onSubmit={handleSubmit} initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
          <motion.label className="login-field" htmlFor="login-email" variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
            <span>Correo electrónico</span>
            <input id="login-email" type="email" placeholder="Ej: ana@correo.cl" autoComplete="email" required />
          </motion.label>
          <motion.label className="login-field" htmlFor="login-password" variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
            <span>Contraseña</span>
            <input id="login-password" type="password" placeholder="Ingresa tu contraseña" autoComplete="current-password" required />
          </motion.label>
          <button type="button" className="login-recovery">¿Olvidaste tu contraseña?</button>
          {isReady && <motion.p className="login-notice" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>El acceso quedará conectado próximamente.</motion.p>}
          <button type="submit" className="login-submit">
            Ingresar como {accountType === "client" ? "cliente" : "cliente ejecutivo"}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </motion.form>

        <div className="login-divider"><span>o</span></div>
        <Link href="/registrarme" className="login-create"><LockKeyhole size={17} aria-hidden="true" /> Registrarme como cliente</Link>
      </motion.section>
    </main>
  );
}
