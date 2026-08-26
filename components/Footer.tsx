"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Clock3, FileText, Globe2, Mail, MapPin, MessageCircle, Phone, ShieldCheck, UsersRound } from "lucide-react";

const navigation = [
  ["Inicio", "/"],
  ["Cómo funciona", "/como-funciona"],
  ["Importación para uso personal", "/soluciones"],
  ["Seguimiento de solicitud", "/seguimiento"],
  ["Preguntas frecuentes", "/preguntas-frecuentes"],
  ["Contacto", "/contacto"],
];

const services = [
  "Búsqueda de soluciones",
  "Acceso internacional",
  "Importación de medicamentos",
  "Segunda opinión médica",
  "Acompañamiento experto",
];

const information = [
  ["Quiénes somos", "/nosotros"],
  ["Términos y condiciones", "/politicas"],
  ["Política de privacidad", "/politicas"],
  ["Aviso legal", "/politicas"],
];

const partners = [
  { src: "/images/footer/logo-banchile_pagos.svg", alt: "Banco de Chile" },
  { src: "/images/footer/logo-camara-de-comercio-santiago.jpeg", alt: "Cámara de Comercio de Santiago" },
  { src: "/images/footer/logo-dhl.png", alt: "DHL" },
];

const reveal = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export default function Footer() {
  const pathname = usePathname();

  // No mostrar Footer en sistema privado (/app)
  if (pathname.startsWith("/app")) {
    return null;
  }

  return (
    <footer className="site-footer">
      <div className="site-footer-main">
        <motion.div className="footer-brand" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal}>
          <Link href="/" className="footer-logo">AXESSIA</Link>
          <p>Acceso inteligente a soluciones de salud.</p>
          <div className="footer-socials" aria-label="Redes sociales">
            <Link href="/contacto" aria-label="Red social, canal pendiente"><Globe2 size={19} aria-hidden="true" /></Link>
            <Link href="/contacto" aria-label="Red profesional, canal pendiente"><UsersRound size={19} aria-hidden="true" /></Link>
            <Link href="/contacto" aria-label="WhatsApp, canal pendiente"><MessageCircle size={19} aria-hidden="true" /></Link>
          </div>
          <small>Redes sociales disponibles próximamente.</small>
        </motion.div>

        <FooterColumn title="Navegación" items={navigation} />
        <FooterColumn title="Servicios" items={services.map((item) => [item, "/soluciones"])} />
        <FooterColumn title="Información" items={information} />

        <motion.div className="footer-contact" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal}>
          <h2>Contacto</h2>
          <ContactLine icon={Mail} text="Correo disponible próximamente" />
          <ContactLine icon={Phone} text="Teléfono disponible próximamente" />
          <ContactLine icon={MapPin} text="Ubicación disponible próximamente" />
          <ContactLine icon={Clock3} text="Horario disponible próximamente" />
        </motion.div>
      </div>

      <motion.div className="footer-regulatory" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal}>
        <div className="footer-regulatory-copy">
          <FileText size={28} aria-hidden="true" />
          <div>
            <h2>Aliados que fortalecen tu experiencia</h2>
            <p>Trabajamos con aliados estratégicos para ofrecerte un servicio más seguro, conectado y eficiente.</p>
          </div>
        </div>
        <div className="footer-partner-logos" aria-label="Aliados estratégicos de AXESSIA">
          {partners.map((partner) => (
            <span className={`footer-partner-logo ${partner.alt === "Cámara de Comercio de Santiago" ? "footer-partner-logo-ccs" : ""}`} key={partner.src}>
              <Image src={partner.src} alt={partner.alt} width={150} height={60} />
            </span>
          ))}
        </div>
      </motion.div>

      <div className="footer-trust">
        <div className="footer-trust-copy">
          <ShieldCheck size={28} aria-hidden="true" />
          <div>
            <h2>Tu información está protegida</h2>
            <p>Procesos seguros, confidenciales y alineados con la normativa vigente.</p>
          </div>
        </div>
        <div className="footer-payments">
          <h2>Medios de pago</h2>
          <div className="footer-payment-logos" aria-label="Medios de pago aceptados">
            {[1, 2, 3, 4].map((payment) => (
              <span className="footer-payment-logo" key={payment}>
                <Image
                  src={`/images/footer/${payment}.png`}
                  alt={payment === 1 ? "Visa" : payment === 2 ? "Mastercard" : payment === 3 ? "American Express" : "RedCompra"}
                  width={92}
                  height={48}
                />
              </span>
            ))}
          </div>
        </div>
        <div className="footer-help">
          <MessageCircle size={28} aria-hidden="true" />
          <div>
            <h2>¿Necesitas ayuda?</h2>
            <p>Nuestro equipo estará disponible para acompañarte en todo el proceso.</p>
            <Link href="/contacto">Solicitar contacto por WhatsApp <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} AXESSIA</span>
        <span>Información y canales oficiales disponibles próximamente.</span>
      </div>
    </footer>
  );
}

function FooterColumn({ title, items }: { title: string; items: string[][] }) {
  return (
    <motion.nav className="footer-column" aria-label={title} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal}>
      <h2>{title}</h2>
      <ul>
        {items.map(([label, href]) => <li key={label}><Link href={href}>{label}</Link></li>)}
      </ul>
    </motion.nav>
  );
}

function ContactLine({ icon: Icon, text }: { icon: typeof Mail; text: string }) {
  return <p className="footer-contact-line"><Icon size={17} aria-hidden="true" /><span>{text}</span></p>;
}
