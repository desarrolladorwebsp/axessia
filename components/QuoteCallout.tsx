"use client";

import { motion } from "framer-motion";
import { ArrowUp, ArrowUpRight, Clock3 } from "lucide-react";
import { QuoteTrigger } from "@/components/QuoteModal";

const steps = [
  {
    number: "01",
    title: "Sube tu receta",
    description: "Fotografía o carga tu receta de forma rápida y segura.",
  },
  {
    number: "02",
    title: "Analizamos tu solicitud",
    description: "Evaluamos el medicamento y buscamos las mejores opciones.",
  },
  {
    number: "03",
    title: "Te respondemos",
    description: "Recibe la alternativa y el valor en hasta 48 horas.",
  },
];

const reveal = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function QuoteCallout() {
  return (
    <section className="quote-callout" aria-labelledby="quote-callout-title">
      <div className="quote-callout-main">
        <motion.div
          className="quote-callout-copy"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={reveal}
        >
          <p className="eyebrow">Acceso simple y seguro</p>
          <h2 id="quote-callout-title">
            ¿Necesitas cotizar
            <br />
            un <span className="gradient-text">medicamento?</span>
          </h2>
          <p className="quote-callout-description">
            Sube tu receta y buscamos las mejores alternativas disponibles para ti en Chile y el extranjero.
          </p>
          <p className="quote-response">
            <Clock3 size={20} aria-hidden="true" />
            Respuesta a tu solicitud en hasta <span>48 horas.</span>
          </p>
          <QuoteTrigger className="quote-callout-cta">
            <span className="quote-callout-cta-icon">
              <ArrowUp size={30} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="quote-callout-cta-copy">
              <strong>Subir mi receta</strong>
              <small>PDF · JPG · PNG</small>
            </span>
            <ArrowUpRight className="quote-callout-cta-arrow" size={22} aria-hidden="true" />
          </QuoteTrigger>

        </motion.div>

      </div>

      <motion.div
        className="quote-callout-steps"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      >
        <div className="quote-confidence">
          <p>Tu salud, nuestras soluciones.</p>
          <span>Gestionamos tu solicitud con seguridad, transparencia y cercanía.</span>
        </div>
        {steps.map((step) => (
          <motion.div className="quote-callout-step" key={step.number} variants={reveal}>
            <span className="quote-step-number">{step.number}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
