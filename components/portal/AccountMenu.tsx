"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ClipboardList, LogOut, UserRound } from "lucide-react";
import { PORTAL_HOME_PATH, PORTAL_PROFILE_PATH } from "@/lib/portal/paths";

export default function AccountMenu({
  variant = "dropdown",
  onNavigate,
}: {
  variant?: "dropdown" | "stack";
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isOnPortal = pathname.startsWith("/mi-cuenta");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open || variant !== "dropdown") return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, variant]);

  const logout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      onNavigate?.();
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/ingresar");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const go = (href: string) => {
    setOpen(false);
    onNavigate?.();
    router.push(href);
  };

  const items = (
    <>
      <Link
        href={PORTAL_HOME_PATH}
        role={variant === "dropdown" ? "menuitem" : undefined}
        onClick={(event) => {
          event.preventDefault();
          go(PORTAL_HOME_PATH);
        }}
        className={itemClass(variant)}
      >
        <ClipboardList className="h-4 w-4" aria-hidden="true" />
        Mis solicitudes
      </Link>
      <Link
        href={PORTAL_PROFILE_PATH}
        role={variant === "dropdown" ? "menuitem" : undefined}
        onClick={(event) => {
          event.preventDefault();
          go(PORTAL_PROFILE_PATH);
        }}
        className={itemClass(variant)}
      >
        <UserRound className="h-4 w-4" aria-hidden="true" />
        Mi perfil
      </Link>
      <button
        type="button"
        role={variant === "dropdown" ? "menuitem" : undefined}
        onClick={() => void logout()}
        disabled={busy}
        className={`${itemClass(variant)} w-full text-left disabled:opacity-50`}
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {busy ? "Saliendo..." : "Cerrar sesión"}
      </button>
    </>
  );

  if (variant === "stack") {
    return (
      <div className="grid gap-1">
        <p className="px-4 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
          Mi cuenta
        </p>
        {items}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        aria-current={isOnPortal ? "page" : undefined}
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-1 py-2 text-[0.78rem] font-semibold text-[var(--navy)] transition-colors hover:text-[var(--blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2"
      >
        Mi cuenta
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            id={menuId}
            role="menu"
            aria-label="Mi cuenta"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-2xl border border-[var(--border)] bg-white py-1.5 shadow-[0_16px_36px_rgba(7,30,65,0.12)]"
          >
            {items}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function itemClass(variant: "dropdown" | "stack") {
  if (variant === "stack") {
    return "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-[var(--navy)] transition-colors hover:bg-[var(--background)] hover:text-[var(--blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]";
  }
  return "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[var(--navy)] hover:bg-[var(--background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--blue)]";
}
