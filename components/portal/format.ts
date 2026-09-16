export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(new Date(value));
}

export function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return `$${amount.toLocaleString("es-CL")}`;
}
