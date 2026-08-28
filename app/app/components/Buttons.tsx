"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type ButtonSize = "sm" | "md";

type SharedProps = {
  children: React.ReactNode;
  icon?: LucideIcon;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  href?: string;
  onClick?: () => void;
  title?: string;
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-4 text-xs",
};

// Acción principal del sistema: pill con degradado de marca
export function PrimaryButton({ children, icon: Icon, size = "md", className = "", disabled, type = "button", href, onClick, title }: SharedProps) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--cyan)] to-[var(--blue)] font-bold text-white shadow-[0_12px_28px_rgba(8,127,213,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(8,127,213,0.32)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${sizeClasses[size]} ${className}`;
  const content = (
    <>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </>
  );
  if (href) return <Link href={href} className={classes} title={title}>{content}</Link>;
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes} title={title}>
      {content}
    </button>
  );
}

// Acción secundaria: borde sutil, uso en cancelar/volver/acciones auxiliares
export function SecondaryButton({ children, icon: Icon, size = "md", className = "", disabled, type = "button", href, onClick, title }: SharedProps) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] font-bold text-[var(--navy)] transition hover:border-[var(--blue)] hover:text-[var(--blue)] disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses[size]} ${className}`;
  const content = (
    <>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </>
  );
  if (href) return <Link href={href} className={classes} title={title}>{content}</Link>;
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes} title={title}>
      {content}
    </button>
  );
}
