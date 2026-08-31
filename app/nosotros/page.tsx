import Image from "next/image";
import { Clock3, Globe2, Heart, ShieldCheck, Target, TrendingUp, UsersRound } from "lucide-react";
import QuoteCallout from "@/components/QuoteCallout";

const benefits = [
  {
    icon: UsersRound,
    title: "Alianzas estratégicas",
    description: "Trabajamos con laboratorios y proveedores internacionales de confianza.",
  },
  {
    icon: ShieldCheck,
    title: "Acceso a tratamientos",
    description: "Abrimos la puerta a medicamentos que no están disponibles en el mercado nacional.",
  },
  {
    icon: Clock3,
    title: "Rapidez y eficiencia",
    description: "Procesos ágiles para que recibas tu tratamiento en el menor tiempo posible.",
  },
  {
    icon: UsersRound,
    title: "Acompañamiento real",
    description: "Te informamos en cada etapa y resolvemos tus dudas siempre.",
  },
];

const values = [
  { icon: Heart, title: "Empatía", description: "Entendemos tu situación porque el acceso también necesita cercanía." },
  { icon: ShieldCheck, title: "Confianza", description: "Transparencia total en cada paso del proceso." },
  { icon: Globe2, title: "Alianzas", description: "Una red global para llegar más lejos." },
  { icon: Target, title: "Enfoque en el paciente", description: "Cada decisión tiene a la persona y su salud en el centro." },
  { icon: TrendingUp, title: "Mejora continua", description: "Buscamos mejores soluciones y mejores condiciones." },
];

export default function AboutPage() {
  return (
    <main className="about-page">
      <section className="about-intro" aria-labelledby="about-title">
        <div className="about-grid">
          <div className="about-copy">
            <p className="eyebrow">NOSOTROS</p>
            <h1 id="about-title">
              En AXESSIA Health Solutions <span className="gradient-text">el paciente está en el centro de todo lo que hacemos.</span>
            </h1>
            <div className="about-rule" aria-hidden="true" />
            <Heart className="about-heart" size={26} strokeWidth={1.8} aria-hidden="true" />
            <div className="about-description">
              <p>Creemos que la salud no debería tener fronteras. Cuando el tratamiento que necesitas existe en algún lugar del mundo pero no está disponible en Chile, o cuesta más de lo que debería, te ayudamos a llegar a él.</p>
              <p>Gestionamos por ti todo el proceso de importación, desde la cotización hasta que el medicamento llega a tus manos, apoyados en alianzas estratégicas que nos permiten actuar con rapidez y un estándar profesional.</p>
              <p>Tú te enfocas en tu tratamiento; nosotros nos encargamos del resto, paso a paso y siempre con claridad sobre en qué etapa está tu pedido.</p>
            </div>
            <div className="about-promise">
              <span className="about-promise-icon"><ShieldCheck size={26} aria-hidden="true" /></span>
              <p><strong>Transparencia, rapidez y compromiso</strong><span>Para que accedas al tratamiento que necesitas, sin importar dónde esté.</span></p>
            </div>
          </div>

          <div className="about-image-wrap">
            <Image
              src="/images/OperationsProcess-section/bg-operationes.png"
              alt="Equipo AXESSIA gestionando solicitudes internacionales"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 50vw"
              className="about-image"
            />
          </div>
        </div>

        <ul className="about-benefits" aria-label="Pilares de AXESSIA">
          {benefits.map(({ icon: Icon, title, description }) => (
            <li key={title}>
              <span className="about-benefit-icon"><Icon size={25} strokeWidth={1.7} aria-hidden="true" /></span>
              <p><strong>{title}</strong><span>{description}</span></p>
            </li>
          ))}
        </ul>
      </section>

      <section className="about-purpose" aria-labelledby="purpose-title">
        <div className="about-purpose-grid">
          <div className="about-purpose-copy">
            <p className="eyebrow">QUIÉNES SOMOS</p>
            <h2 id="purpose-title">
              AXESSIA Health Solutions nace para <span className="gradient-text">acortar distancias</span> y abrir acceso a la salud.
            </h2>
            <div className="about-purpose-rule" aria-hidden="true" />
            <div className="about-purpose-description">
              <p>AXESSIA Health Solutions nace de una convicción simple: <strong>el acceso a la salud no debería depender de dónde vives ni de cuánto puedes pagar.</strong></p>
              <p>Sabemos lo que significa que un tratamiento exista, pero se sienta lejano por precio, por trámites o porque simplemente no llega a Chile.</p>
              <p>Por eso existimos: para acortar esa distancia y ponernos, de verdad, <strong>del lado del paciente.</strong></p>
            </div>
          </div>

          <div className="about-purpose-visual">
            <Image
              src="/images/bg-seguimiento.png"
              alt="Persona revisando el seguimiento de su solicitud AXESSIA"
              fill
              sizes="(max-width: 900px) 100vw, 50vw"
              className="about-purpose-image"
            />
            <div className="about-service-summary" aria-label="Compromiso de servicio AXESSIA">
              <div><UsersRound aria-hidden="true" /><strong>Atención cercana</strong><span>Acompañamiento durante el proceso</span></div>
              <div><Globe2 aria-hidden="true" /><strong>Red internacional</strong><span>Acceso mediante alianzas estratégicas</span></div>
              <div><ShieldCheck aria-hidden="true" /><strong>Gestión transparente</strong><span>Información clara en cada etapa</span></div>
            </div>
          </div>
        </div>

        <div className="about-values" aria-labelledby="values-title">
          <p id="values-title">LO QUE NOS MUEVE</p>
          <ul>
            {values.map(({ icon: Icon, title, description }) => (
              <li key={title}>
                <span><Icon size={29} strokeWidth={1.7} aria-hidden="true" /></span>
                <strong>{title}</strong>
                <p>{description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="about-work" aria-labelledby="about-work-title">
        <div className="about-work-heading">
          <p className="eyebrow">LO QUE HACEMOS</p>
          <h2 id="about-work-title">Un proceso complejo, <span className="gradient-text">acompañado de principio a fin.</span></h2>
        </div>
        <div className="about-work-grid">
          <article>
            <span>01</span>
            <h3>Gestión de importación</h3>
            <p>Nos dedicamos a gestionar la importación de medicamentos para pacientes en Chile, desde la cotización hasta la coordinación del envío.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Coordinación especializada</h3>
            <p>Articulamos la coordinación regulatoria y sanitaria junto a actores especializados en las distintas partes del proceso.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Acceso internacional</h3>
            <p>Buscamos condiciones convenientes y acceso a medicamentos de especialidad que no están disponibles en el mercado nacional.</p>
          </article>
        </div>
      </section>

      <section className="about-way" aria-labelledby="about-way-title">
        <div>
          <p className="eyebrow">CÓMO TRABAJAMOS</p>
          <h2 id="about-way-title">La confianza es parte <span className="gradient-text">del producto.</span></h2>
        </div>
        <div className="about-way-copy">
          <p>Simplificamos un proceso que, por su naturaleza, tiene muchas partes en movimiento, y lo hacemos con transparencia real: sabes qué estás comprando y en qué etapa se encuentra tu pedido en todo momento.</p>
          <p>No prometemos que todos los procesos serán iguales de simples ni igual de rápidos. Cada medicamento y cada gestión sanitaria tiene sus propios tiempos; sí prometemos ocuparnos de cada paso con seriedad, cuidado y la mayor rapidez posible.</p>
        </div>
      </section>

      <QuoteCallout />
    </main>
  );
}