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
      <aside className="hidden md:flex md:w-64 md:flex-col bg-[var(--navy)] text-white border-r border-[var(--border)]">
        <div className="p-6 flex flex-col items-start">
          <Image
            src="/images/logo-axessia-white.png"
            alt="Logo AXESSIA"
            width={120}
            height={40}
            priority
            className="h-10 w-auto"
          />
          <p className="text-xs text-[var(--cyan)] mt-3 font-medium">
            Sistema de Gestión
          </p>
        </div>

        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <SidebarNav />
        </nav>

        <div className="p-4 border-t border-[var(--navy-dark)] text-xs text-white opacity-60">
          <p>© 2026 AXESSIA</p>
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
