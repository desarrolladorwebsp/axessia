"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { QuoteTrigger } from "@/components/QuoteModal";

const navigation = [
  { label: "Inicio", href: "/" },
  { label: "Seguimiento", href: "/seguimiento" },
  { label: "Contacto", href: "/contacto" },
];

function isCurrentRoute(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  // No mostrar Navbar en sistema privado (/app)
  if (pathname.startsWith("/app")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[rgba(247,249,252,0.9)] backdrop-blur-md">
      <nav
        aria-label="Navegación principal"
        className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8"
      >
        <Link
          href="/"
          className="shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2"
        >
          <Image
            src="/images/logo-axessia.png"
            alt="Logo AXESSIA"
            width={140}
            height={46}
            priority
            className="h-[2.875rem] w-auto"
          />
        </Link>

        <div className="hidden items-center gap-5 lg:flex">
          {navigation.map((item) => {
            const isActive = isCurrentRoute(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative whitespace-nowrap rounded-lg px-1 py-2 text-[0.78rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2 ${
                  isActive
                    ? "text-[var(--navy)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--navy)]"
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.span
                    layoutId="active-navigation"
                    className="absolute inset-x-1 -bottom-1 h-0.5 rounded-full bg-[var(--blue)]"
                    transition={{ duration: 0.2 }}
                  />
                )}
              </Link>
            );
          })}
          <Link
            href="/ingresar"
            className="whitespace-nowrap rounded-lg px-1 py-2 text-[0.78rem] font-semibold text-[var(--navy)] transition-colors hover:text-[var(--blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2"
          >
            Ingresar
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <QuoteTrigger
            className="brand-gradient inline-flex min-h-11 items-center justify-center rounded-full px-4 text-[0.72rem] font-bold uppercase tracking-[0.08em] text-white shadow-[0_8px_20px_rgba(8,127,213,0.2)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2 active:translate-y-0 sm:px-5 sm:text-xs"
          >
            Cotizar
          </QuoteTrigger>
          <button
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--navy)] transition-colors hover:border-[var(--blue)] hover:text-[var(--blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2 lg:hidden"
          >
            <span className="relative h-4 w-5" aria-hidden="true">
              <span className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition-transform ${isMenuOpen ? "translate-y-[7px] rotate-45" : ""}`} />
              <span className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-current transition-opacity ${isMenuOpen ? "opacity-0" : ""}`} />
              <span className={`absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-current transition-transform ${isMenuOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            id="mobile-navigation"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden border-t border-[var(--border)] bg-white lg:hidden"
          >
            <div className="mx-auto grid max-w-[1440px] gap-1 px-5 py-4 sm:px-6 lg:px-8">
              {navigation.map((item) => {
                const isActive = isCurrentRoute(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] ${
                      isActive
                        ? "bg-[rgba(8,127,213,0.08)] text-[var(--blue)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--background)] hover:text-[var(--navy)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/ingresar"
                className="rounded-xl px-4 py-3 text-sm font-semibold text-[var(--navy)] transition-colors hover:bg-[var(--background)] hover:text-[var(--blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
              >
                Ingresar al sistema
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}