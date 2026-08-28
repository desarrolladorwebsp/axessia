export type StatusTone = "info" | "warning" | "progress" | "accent" | "success" | "danger" | "neutral";

const toneClasses: Record<StatusTone, string> = {
  info: "bg-blue-50 text-blue-700",
  warning: "bg-amber-50 text-amber-700",
  progress: "bg-blue-50 text-[var(--blue)]",
  accent: "bg-violet-50 text-[var(--purple)]",
  success: "bg-emerald-50 text-emerald-700",
  danger: "bg-rose-50 text-rose-700",
  neutral: "bg-slate-100 text-slate-600",
};

export default function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: StatusTone }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${toneClasses[tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
