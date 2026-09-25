"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export type SidebarUserInfo = {
  name: string;
  initials: string;
  roleLabel: string;
};

export default function SidebarUser({ user, onNavigate }: { user: SidebarUserInfo; onNavigate?: () => void }) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState("");

  const signOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("No fue posible cerrar la sesión");
      onNavigate?.();
      router.replace("/ingresar");
      router.refresh();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "No fue posible cerrar la sesión");
      setIsSigningOut(false);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--cyan)] text-sm font-bold text-[var(--navy-dark)]">
          {user.initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-white/50">{user.roleLabel}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void signOut()}
        disabled={isSigningOut}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-white/85 transition-colors hover:border-[var(--cyan)] hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {isSigningOut ? "Cerrando sesión..." : "Cerrar sesión"}
      </button>

      {error ? (
        <p role="alert" className="mt-2 text-[11px] font-semibold text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
