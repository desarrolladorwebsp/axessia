"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Check, LockKeyhole, Search } from "lucide-react";

const stages = [
  { number: "01", label: "Recibida", title: "Hemos recibido tu receta y generado tu ID único.", date: "24 Abr, 09:15", complete: true },
  { number: "02", label: "Evaluación", title: "Nuestro equipo busca las mejores alternativas para ti.", date: "24 Abr, 11:32", complete: true },
  { number: "03", label: "Cotización", title: "Hemos encontrado la mejor opción. Tu cotización está disponible.", date: "24 Abr, 14:32", complete: true, current: true },
  { number: "04", label: "Aprobación", title: "Esperamos tu aprobación para continuar.", date: "Pendiente", complete: false },
  { number: "05", label: "Gestión", title: "Estamos gestionando tu solicitud en el país de origen.", date: "Pendiente", complete: false },
  { number: "06", label: "Entrega", title: "Tu medicamento será entregado de forma segura.", date: "Pendiente", complete: false },
];

const reveal = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function TrackingSection() {
  const [requestId, setRequestId] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSearched(Boolean(requestId.trim()));
  };

  return (
    <section className="tracking-section" id="seguimiento" aria-labelledby="tracking-title">
      <div className="tracking-hero">
        <motion.div className="tracking-copy" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal}>
          <p className="eyebrow">Seguimiento inteligente</p>
          <h2 id="tracking-title">
            Tu solicitud,
            <br />
            <span className="gradient-text">siempre a la vista.</span>
          </h2>
          <p className="tracking-subtitle">Consulta su estado con tu ID.</p>
          <div className="tracking-rule brand-gradient" />
          <p className="tracking-description">Ingresa tu ID AXESSIA y conoce en segundos en qué etapa se encuentra tu solicitud. <strong>Simple, rápido y desde cualquier dispositivo.</strong></p>
          <form className="tracking-form" onSubmit={handleSubmit}>
            <label htmlFor="tracking-id">ID de solicitud</label>
            <div className="tracking-input-row">
              <input id="tracking-id" value={requestId} onChange={(event) => { setRequestId(event.target.value); setHasSearched(false); }} placeholder="Ej: AXS-2026-0587" />
              <button type="submit" aria-label="Consultar estado"><Search size={18} aria-hidden="true" /><span>Consultar estado</span></button>
            </div>
            {hasSearched && <motion.p className="tracking-result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><Check size={16} aria-hidden="true" /> Solicitud encontrada. Revisa su avance abajo.</motion.p>}
          </form>
          <p className="tracking-security"><LockKeyhole size={16} aria-hidden="true" /> Información 100% segura y confidencial.</p>
        </motion.div>

        <motion.div className="tracking-visual-placeholder" initial={{ opacity: 0, scale: 1.02 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.65 }} aria-hidden="true">
          <div className="tracking-tranquility"><Check size={17} aria-hidden="true" /> Tu tranquilidad, en cada etapa.</div>
        </motion.div>
      </div>

      <div className="tracking-process-head"><span className="brand-gradient" /><h3>Así avanza tu solicitud</h3><span className="brand-gradient" /></div>
      <motion.div className="tracking-stages" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
        {stages.map((stage) => (
          <motion.article className={`tracking-stage ${stage.current ? "is-current" : ""}`} key={stage.number} variants={reveal}>
            <div className="tracking-stage-heading"><span>{stage.number}</span><strong>{stage.label}</strong></div>
            <div className="tracking-stage-line"><i className={stage.complete ? "is-complete" : ""} /></div>
            <p>{stage.title}</p>
            <small>{stage.date}</small>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}
