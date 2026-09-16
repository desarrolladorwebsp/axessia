"use client";

import { QuoteTrigger } from "@/components/QuoteModal";
import { Plus } from "lucide-react";

export default function NewRequestButton({
  label = "Nueva solicitud",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <QuoteTrigger
      className={
        className
        ?? "brand-gradient inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(8,127,213,0.18)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2 sm:w-auto"
      }
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      {label}
    </QuoteTrigger>
  );
}
