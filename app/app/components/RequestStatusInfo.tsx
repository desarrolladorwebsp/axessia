"use client";

import { CircleHelp } from "lucide-react";
import { REQUEST_FLOW_STATUSES, REQUEST_STATUS_DESCRIPTIONS, REQUEST_STATUS_LABELS } from "@/lib/request-status";

export default function RequestStatusInfo() {
  return (
    <details className="group relative w-fit">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[10px] font-bold text-[var(--text-secondary)] transition hover:text-[var(--blue)]">
        <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
        ¿Qué significa cada estado?
      </summary>
      <div className="absolute right-0 top-6 z-20 w-80 rounded-xl border border-[var(--border)] bg-white p-3 shadow-[0_12px_30px_rgba(7,30,65,0.14)]">
        <ul className="space-y-2">
          {REQUEST_FLOW_STATUSES.map((status) => (
            <li key={status}>
              <p className="text-[10px] font-extrabold text-[var(--navy)]">{REQUEST_STATUS_LABELS[status]}</p>
              <p className="text-[10px] leading-relaxed text-[var(--text-secondary)]">{REQUEST_STATUS_DESCRIPTIONS[status]}</p>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}