"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function PortalLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/ingresar");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-xs font-bold text-[var(--navy)] transition hover:border-[var(--blue)] hover:text-[var(--blue)] disabled:opacity-50"
    >
      <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
      {busy ? "Saliendo..." : "Cerrar sesión"}
    </button>
  );
}
