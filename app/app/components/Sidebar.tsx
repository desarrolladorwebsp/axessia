"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import SidebarNav from "./SidebarNav";
import { Menu, X } from "lucide-react";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const sidebarVariants = {
    hidden: { x: "-100%" },
    visible: {
      x: 0,
      transition: { type: "spring", stiffness: 100, damping: 20 },
    },
    exit: { x: "-100%" },
  } as const;

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  } as const;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-[var(--navy-dark)] text-white md:flex">
        <div className="border-b border-white/10 p-6">
          <Image
            src="/images/logo-axessia-white.png"
            alt="Logo AXESSIA"
            width={120}
            height={40}
            priority
            className="h-10 w-auto"
          />
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-white/45">
            Panel administrativo
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <SidebarNav />
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--cyan)] text-sm font-bold">AH</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Administrador</p>
              <p className="truncate text-xs text-white/50">Equipo AXESSIA</p>
            </div>
          </div>
          <p className="text-[11px] text-white/35">© 2026 AXESSIA</p>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--navy)] text-white border-b border-[var(--navy-dark)] px-4 py-3 flex items-center justify-between h-[92px]">
        <Image
          src="/images/logo-axessia.png"
          alt="Logo AXESSIA"
          width={100}
          height={33}
          priority
          className="h-8 w-auto"
        />
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)]"
          aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={isOpen}
          aria-controls="mobile-sidebar"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-30 md:hidden"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setIsOpen(false)}
            />

            <motion.aside
              id="mobile-sidebar"
              className="fixed left-0 top-[92px] bottom-0 w-64 bg-[var(--navy)] text-white z-40 md:hidden flex flex-col"
              variants={sidebarVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="p-4 border-b border-[var(--navy-dark)]">
                <p className="text-xs text-[var(--cyan)] font-medium">Sistema de Gestión</p>
              </div>

              <nav className="flex-1 px-4 py-6 overflow-y-auto">
                <SidebarNav onNavigate={() => setIsOpen(false)} />
              </nav>

              <div className="p-4 border-t border-[var(--navy-dark)] text-xs text-white opacity-60">
                <p>© 2026 AXESSIA</p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
