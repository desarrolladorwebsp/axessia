import { normalizeRutForComparison } from "@/lib/tracking-normalization";

/** Cotización aún vigente, con menos de 3 días para el vencimiento. */
export const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
/** Solicitud recibida hace más de 1 día y todavía sin ejecutivo. */
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export const INTERNAL_ALERT_PREVIEW_LIMIT = 50;
/** La etiqueta aparece cuando hay más de 2 solicitudes activas con el mismo RUT. */
export const ACTIVE_CLIENT_ALERT_MIN_COUNT = 3;
export const ASSIGNMENT_EVENT_TYPE = "EXECUTIVE_ASSIGNED";

/** Rechazada, cancelada o finalizada: no cuentan como activas ni como estancadas. */
export const CLOSED_REQUEST_STATUSES = ["REJECTED", "CANCELLED", "COMPLETED"] as const;

/** Cotizaciones que todavía pueden vencer en la operación interna. */
export const OPEN_QUOTE_STATUSES = ["DRAFT", "READY", "SENT"] as const;

export type OpenQuoteStatus = (typeof OPEN_QUOTE_STATUSES)[number];
export type StalledRequestReason = "UNASSIGNED" | "ASSIGNED_WITHOUT_QUOTE";

export function isClosedRequestStatus(status: string): boolean {
  return (CLOSED_REQUEST_STATUSES as readonly string[]).includes(status);
}

export function isQuoteExpiringSoon(input: {
  status: string;
  validUntil: Date | null;
  now: Date;
}): boolean {
  if (!(OPEN_QUOTE_STATUSES as readonly string[]).includes(input.status)) return false;
  if (!input.validUntil) return false;
  const remaining = input.validUntil.getTime() - input.now.getTime();
  return remaining > 0 && remaining < THREE_DAYS_MS;
}

export function expiringQuoteRange(now: Date): { after: Date; before: Date } {
  return {
    after: now,
    before: new Date(now.getTime() + THREE_DAYS_MS),
  };
}

export function isUnassignedStale(input: {
  status: string;
  assigned: boolean;
  createdAt: Date;
  now: Date;
}): boolean {
  if (isClosedRequestStatus(input.status) || input.assigned) return false;
  return input.now.getTime() - input.createdAt.getTime() > ONE_DAY_MS;
}

export function unassignedStaleBefore(now: Date): Date {
  return new Date(now.getTime() - ONE_DAY_MS);
}

export function isAssignedWithoutQuote(input: {
  status: string;
  assignedAt: Date | null;
  quoteCount: number;
  now: Date;
}): boolean {
  if (isClosedRequestStatus(input.status)) return false;
  if (!input.assignedAt || input.quoteCount > 0) return false;
  return input.now.getTime() - input.assignedAt.getTime() >= THREE_DAYS_MS;
}

export function assignedWithoutQuoteBefore(now: Date): Date {
  return new Date(now.getTime() - THREE_DAYS_MS);
}

export function clientAlertRut(customerRut?: string | null, requesterRut?: string | null): string {
  const source = customerRut?.trim() || requesterRut?.trim() || "";
  return normalizeRutForComparison(source);
}

export function shouldShowActiveClientAlert(activeCount: number): boolean {
  return activeCount >= ACTIVE_CLIENT_ALERT_MIN_COUNT;
}

export type ActiveClientRutRow = {
  customerRut?: string | null;
  requesterRut?: string | null;
  status?: string | null;
};

export function countActiveRequestsForRut(rut: string, rows: ActiveClientRutRow[]): number {
  if (!rut) return 0;
  return rows.filter((row) => {
    if (row.status && isClosedRequestStatus(row.status)) return false;
    return clientAlertRut(row.customerRut, row.requesterRut) === rut;
  }).length;
}
