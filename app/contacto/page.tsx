"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { AtSign, Check, Clock3, Globe2, MessageCircleQuestion, Send, ShieldCheck } from "lucide-react";

type ContactForm = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

const initialForm: ContactForm = { name: "", email: "", phone: "", subject: "", message: "" };

const perks = [
  { icon: MessageCircleQuestion, label: "Resolvemos tus dudas sobre el proceso de importación." },
  { icon: Clock3, label: "Respuesta rápida por parte de nuestro equipo." },
  { icon: ShieldCheck, label: "Acompañamiento cercano en cada etapa." },
];

const socialLinks = [
  { href: "https://www.instagram.com/axessia.cl/", label: "Instagram", icon: AtSign },
  { href: "https://www.facebook.com/profile.php?id=61593967287064", label: "Facebook", icon: Globe2 },
];

export default function ContactPage() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (field: keyof ContactForm, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.subject.trim() || !form.message.trim()) {
      setError("Completa todos los campos obligatorios.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setError("Revisa el formato del correo.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "No fue posible enviar tu mensaje.");

      setSuccess("¡Mensaje enviado! Te responderemos a la brevedad.");
      setForm(initialForm);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No fue posible enviar tu mensaje.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="contact-page">
      <div className="contact-grid">
        <motion.div
          className="contact-copy"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <p className="eyebrow">ESTAMOS PARA AYUDARTE</p>
          <h1>
            Hablemos sobre <span className="gradient-text">tu tratamiento.</span>
          </h1>
          <div className="contact-rule" aria-hidden="true" />
          <p>En AXESSIA podemos resolver tus dudas y orientarte durante todo el proceso de acceso a tu medicamento, desde la cotización hasta el seguimiento de tu solicitud.</p>

          <ul className="contact-perks">
            {perks.map(({ icon: Icon, label }) => (
              <li key={label}>
                <Icon size={19} aria-hidden="true" />
                <span>{label}</span>
              </li>
            ))}
          </ul>

          <div className="contact-socials" aria-label="Redes sociales de AXESSIA">
            {socialLinks.map(({ href, label, icon: Icon }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" className="contact-social-link">
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </a>
            ))}
          </div>

          <div className="contact-visual">
            <Image
              src="/images/bg-seguimiento.png"
              alt="Equipo AXESSIA acompañando el proceso de un paciente"
              fill
              sizes="(max-width: 900px) 100vw, 46vw"
            />
          </div>
        </motion.div>

        <motion.div
          className="contact-form-card"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        >
          <h2>Envíanos un mensaje</h2>
          <p>Completa el formulario y te contactaremos a la brevedad.</p>

          <form className="contact-form" onSubmit={handleSubmit} noValidate>
            <div className="contact-fields">
              <label className="contact-field">
                <span>Nombre completo</span>
                <input type="text" placeholder="Ej: Ana Pérez" value={form.name} onChange={(event) => update("name", event.target.value)} required />
              </label>
              <label className="contact-field">
                <span>Correo electrónico</span>
                <input type="email" placeholder="Ej: ana@correo.cl" value={form.email} onChange={(event) => update("email", event.target.value)} required />
              </label>
              <label className="contact-field">
                <span>Teléfono / WhatsApp</span>
                <input type="tel" placeholder="Ej: +56 9 1234 5678" value={form.phone} onChange={(event) => update("phone", event.target.value)} required />
              </label>
              <label className="contact-field">
                <span>Asunto</span>
                <input type="text" placeholder="Ej: Consulta sobre mi tratamiento" value={form.subject} onChange={(event) => update("subject", event.target.value)} required />
              </label>
              <label className="contact-field">
                <span>Mensaje</span>
                <textarea placeholder="Cuéntanos en qué podemos ayudarte" value={form.message} onChange={(event) => update("message", event.target.value)} required />
              </label>
            </div>

            <p className="contact-note">Tus datos serán utilizados únicamente para responder tu consulta.</p>

            {error && <p className="contact-message contact-message-error">{error}</p>}
            {success && (
              <p className="contact-message contact-message-success">
                <Check size={16} aria-hidden="true" />
                {success}
              </p>
            )}

            <button className="contact-submit" type="submit" disabled={isSubmitting}>
              <Send size={17} aria-hidden="true" />
              {isSubmitting ? "Enviando..." : "Enviar mensaje"}
            </button>
          </form>
        </motion.div>
      </div>
    </main>
  );
}