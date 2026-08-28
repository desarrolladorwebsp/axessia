"use client";

import { ChevronDown, Search } from "lucide-react";

export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-white p-3 shadow-[0_7px_22px_rgba(7,30,65,0.035)] lg:flex-row lg:items-center">
      {children}
    </section>
  );
}

export function SearchField({ value, onChange, placeholder, label = "Buscar" }: { value: string; onChange: (value: string) => void; placeholder: string; label?: string }) {
  return (
    <label className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
      <span className="sr-only">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-xs outline-none transition focus:border-[var(--blue)] focus:ring-4 focus:ring-[var(--blue)]/10"
      />
    </label>
  );
}

export function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="relative min-w-[145px] flex-1 lg:flex-none">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-xl border border-[var(--border)] bg-white px-3 pr-8 text-xs font-semibold text-[var(--navy)] outline-none focus:border-[var(--blue)]"
      >
        <option value={options[0]}>{label}: {options[0]}</option>
        {options.slice(1).map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-secondary)]" />
    </label>
  );
}

export function FilterButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--purple)] px-3 text-xs font-bold text-[var(--purple)] transition hover:bg-violet-50"
    >
      {children}
    </button>
  );
}
