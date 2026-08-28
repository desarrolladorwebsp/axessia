"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClassName?: string;
  /** When false, the modal only closes through an explicit action (close button/footer), never backdrop click or Escape. Defaults to true. */
  dismissible?: boolean;
};

export default function Modal({ open, onClose, title, description, children, footer, maxWidthClassName = "max-w-3xl", dismissible = true }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, dismissible]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-[var(--navy-dark)]/55 backdrop-blur-sm"
            onClick={dismissible ? onClose : undefined}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={`relative flex max-h-[92vh] w-full ${maxWidthClassName} flex-col overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_rgba(7,30,65,0.25)]`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-extrabold text-[var(--navy)]">{title}</h2>
                {description && <p className="mt-1 text-xs text-[var(--text-secondary)]">{description}</p>}
              </div>
              <button type="button" onClick={onClose} className="icon-button-small shrink-0" aria-label="Cerrar" title="Cerrar">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
            {footer && <div className="border-t border-[var(--border)] p-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
