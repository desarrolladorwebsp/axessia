import OperationsProcess from "@/components/OperationsProcess";
import { QuoteTrigger } from "@/components/QuoteModal";
import QuoteCallout from "@/components/QuoteCallout";

export default function Home() {
  return (
    <>
      <main className="hero-home relative isolate min-h-[calc(100vh-92px)] overflow-hidden">
        <div className="mx-auto flex min-h-[calc(100vh-92px)] max-w-[1440px] items-start sm:items-center px-5 py-20 sm:px-8 lg:px-12">
          <div className="hero-copy relative z-10 max-w-xl pb-24 sm:pb-32 lg:max-w-[600px]">
          <p className="text-xs font-bold uppercase tracking-[0.42em] text-[var(--blue)] sm:text-sm">
            Acceso inteligente
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.38em] text-[var(--text-secondary)] sm:text-sm">
            A soluciones de salud
          </p>
          <h1 className="mt-10 max-w-[580px] font-display text-4xl font-extrabold leading-[1.08] text-[var(--navy)] sm:max-w-[500px] sm:text-5xl lg:max-w-[600px] lg:text-[3.2rem]">
            
            Te ayudamos a acceder a tus
            {" "}
            <span className="gradient-text">medicamentos</span> y
            <br />
            <span className="gradient-text">dispositivos médicos.</span>
          </h1>
          <div className="brand-gradient mt-7 h-1 w-12 rounded-full" />
          <p className="hero-description mt-7 max-w-[430px] text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
            Conectamos necesidades de salud con las mejores opciones disponibles en el mundo.
          </p>
          <QuoteTrigger
            className="brand-gradient mt-8 inline-flex min-h-11 items-center gap-5 rounded-lg px-6 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(8,127,213,0.25)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2"
          >
            Cotiza desde tu receta
            <span aria-hidden="true" className="text-lg leading-none">→</span>
          </QuoteTrigger>
          </div>
        </div>
      </main>
      <OperationsProcess />
      <QuoteCallout />
    </>
  );
}