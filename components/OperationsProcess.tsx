"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { BadgeCheck, Globe2, ShieldCheck, UsersRound } from "lucide-react";
import { QuoteTrigger } from "@/components/QuoteModal";

const benefits = [
  { label: "Experiencia internacional", icon: Globe2 },
  { label: "Equipo experto", icon: UsersRound },
  { label: "Gestión segura", icon: ShieldCheck },
  { label: "Compromiso total", icon: BadgeCheck },
];

const steps = [
  {
    number: "01",
    title: "Recibimos tu receta",
    description: "La recibimos y registramos.",
  },
  {
    number: "02",
    title: "Asignamos tu ID",
    description: "Creamos un ID único para tu solicitud.",
  },
  {
    number: "03",
    title: "Cotizamos tu solicitud",
    description: "Buscamos y evaluamos. Te enviamos el valor.",
  },
  {
    number: "04",
    title: "Tú apruebas",
    description: "Revisas la cotización y decides continuar.",
  },
  {
    number: "05",
    title: "Gestionamos tu pedido",
    description: "Iniciamos la solicitud y realizamos todos los procesos.",
  },
  {
    number: "06",
    title: "Seguimos el traslado",
    description: "Supervisamos cada avance hasta la llegada.",
  },
  {
    number: "07",
    title: "Te lo entregamos",
    description: "Coordinamos la entrega y completamos el proceso.",
  },
];

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

export default function OperationsProcess() {
  return (
    <section className="operations-process" aria-labelledby="operations-process-title">
      <div className="operations-intro">
        <Image
          src="/images/OperationsProcess-section/bg-operationes.png"
          alt="Equipo de operaciones AXESSIA gestionando solicitudes de salud"
          fill
          priority={false}
          sizes="(max-width: 767px) 100vw, 70vw"
          className="operations-image"
        />
        <div className="operations-intro-shade" />
        <div className="operations-intro-content">
          <div className="operations-intro-inner">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} variants={reveal}>
              <p className="eyebrow">Operaciones internacionales</p>
              <h2 id="operations-process-title">
                De tu receta
                <br />
                a la <span className="gradient-text">entrega.</span>
              </h2>
              <div className="operations-rule brand-gradient" />
              <p className="operations-lead">Un proceso gestionado de principio a fin.</p>
            </motion.div>

            <motion.div
              className="operations-benefits"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            >
              {benefits.map(({ label, icon: Icon }) => (
                <motion.div className="operations-benefit" key={label} variants={reveal}>
                  <Icon className="benefit-icon" aria-hidden="true" strokeWidth={1.8} />
                  <span>{label}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      <div className="operations-timeline">
        <motion.p
          className="operations-timeline-intro"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={reveal}
        >
          Así opera AXESSIA por dentro, para que tú tengas <span>resultados</span> por fuera.
        </motion.p>
        <motion.ol
          className="operations-steps"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.12 }}
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {steps.map((step) => (
            <motion.li className="operations-step" key={step.number} variants={reveal}>
              <span className="step-number">{step.number}</span>
              <span className="step-dot" aria-hidden="true" />
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </motion.li>
          ))}
        </motion.ol>
        <motion.div
          className="operations-footer"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={reveal}
        >
          <p>
            <span>Transparencia</span> en cada etapa. Información clara y <strong>acompañamiento</strong> permanente.
          </p>
          <QuoteTrigger className="operations-cta">
            Subir mi receta
            <span aria-hidden="true">→</span>
          </QuoteTrigger>
        </motion.div>
      </div>
    </section>
  );
}
