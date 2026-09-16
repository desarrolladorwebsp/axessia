export const CUSTOMER_VISIBLE_QUOTE_STATUSES = ["SENT", "ACCEPTED", "REJECTED", "EXPIRED", "VOIDED"] as const;

export type CustomerVisibleQuoteStatus = (typeof CUSTOMER_VISIBLE_QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  READY: "Lista para enviar",
  SENT: "Enviada",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  EXPIRED: "Vencida",
  VOIDED: "Anulada",
};

export const QUOTE_STATUS_TONES: Record<string, "info" | "warning" | "progress" | "accent" | "success" | "danger" | "neutral"> = {
  DRAFT: "neutral",
  READY: "warning",
  SENT: "info",
  ACCEPTED: "success",
  REJECTED: "danger",
  EXPIRED: "warning",
  VOIDED: "neutral",
};

export function isCustomerVisibleQuoteStatus(status: string): status is CustomerVisibleQuoteStatus {
  return (CUSTOMER_VISIBLE_QUOTE_STATUSES as readonly string[]).includes(status);
}

export function quoteStatusLabel(status: string) {
  return QUOTE_STATUS_LABELS[status] || status;
}
