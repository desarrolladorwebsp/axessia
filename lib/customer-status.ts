export type CustomerStatusLabel = "Activo" | "En proceso" | "Pendiente" | "Finalizado";

const IN_PROCESS_STATUSES = new Set(["RECEIVED", "SOURCING", "QUOTED", "AWAITING_DECISION"]);
const ACTIVE_STATUSES = new Set(["ACCEPTED", "PAID", "SHIPPING", "COMPLETED"]);
const CLOSED_STATUSES = new Set(["REJECTED", "CANCELLED"]);

export const OPEN_REQUEST_STATUSES = ["RECEIVED", "SOURCING", "QUOTED", "AWAITING_DECISION", "ACCEPTED", "PAID", "SHIPPING"] as const;

export function customerStatusLabel(latestStatus: string | null | undefined): CustomerStatusLabel {
  if (latestStatus && IN_PROCESS_STATUSES.has(latestStatus)) return "En proceso";
  if (latestStatus && ACTIVE_STATUSES.has(latestStatus)) return "Activo";
  if (latestStatus && CLOSED_STATUSES.has(latestStatus)) return "Finalizado";
  return "Pendiente";
}

export function isOpenRequestStatus(status: string) {
  return (OPEN_REQUEST_STATUSES as readonly string[]).includes(status);
}
