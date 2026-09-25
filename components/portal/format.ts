import { AXESSIA_LOCALE, formatDateCl, formatDateTimeCl } from "@/lib/datetime";

export function formatDateTime(value: string | null | undefined) {
  return formatDateTimeCl(value);
}

export function formatDate(value: string | null | undefined) {
  return formatDateCl(value);
}

export function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return `$${amount.toLocaleString(AXESSIA_LOCALE)}`;
}
