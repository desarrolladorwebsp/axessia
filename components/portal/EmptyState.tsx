import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function PortalEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-white px-4 py-14 text-center">
      <Inbox className="mb-3 h-10 w-10 text-[var(--text-secondary)] opacity-50" aria-hidden="true" />
      <h3 className="font-display text-lg font-extrabold text-[var(--navy)]">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-[var(--text-secondary)]">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
