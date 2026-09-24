export const REQUEST_EVENT_LABELS: Record<string, string> = {
  REQUEST_RECEIVED: "Solicitud recibida",
  EXECUTIVE_ASSIGNED: "Ejecutivo asignado",
  QUOTE_CREATED: "Cotización creada",
  QUOTE_UPDATED: "Cotización actualizada",
  QUOTE_SENT: "Cotización enviada",
  QUOTE_ACCEPTED: "Cotización aceptada",
  QUOTE_REJECTED: "Cotización rechazada",
  QUOTE_EXPIRED: "Cotización vencida",
  QUOTE_PENDING_REMINDER_SENT: "Recordatorio de cotización enviado",
  QUOTE_EXPIRING_SOON_SENT: "Aviso de vencimiento de cotización enviado",
  MANDATE_GENERATED_AND_SENT: "Mandato generado y enviado",
  SIGNED_MANDATE_ATTACHED: "Mandato firmado adjunto",
  SHIPPING_STARTED: "Despacho iniciado",
  REQUEST_COMPLETED: "Solicitud finalizada",
  REQUEST_COMPLETED_EMAIL_SENT: "Aviso de solicitud finalizada enviado",
  REQUEST_REACTIVATED: "Solicitud reactivada",
  REQUEST_REJECTED: "Solicitud rechazada",
  PAYMENT_STARTED: "Pago iniciado",
  PAYMENT_CONFIRMED: "Pago confirmado",
  TRANSFER_RECEIPT_UPLOADED: "Comprobante de transferencia adjunto",
  PAYMENT_MANUALLY_CONFIRMED: "Pago por transferencia confirmado",
  PAYMENT_CANCELLED: "Pago cancelado",
  PAYMENT_FAILED: "Pago fallido",
  PAYMENT_HELP_REQUESTED: "Ayuda con el pago solicitada",
  ADVANCE_WITHOUT_PAYMENT: "Avance sin pago inmediato",
  CUSTOMER_COMMENT: "Comentario del cliente",
  PROFILE_UPDATED: "Perfil actualizado",
};

const CUSTOMER_EVENT_TYPES = new Set([
  "QUOTE_ACCEPTED",
  "QUOTE_REJECTED",
  "QUOTE_EXPIRED",
  "CUSTOMER_COMMENT",
  "PAYMENT_STARTED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_CANCELLED",
  "PAYMENT_FAILED",
  "PAYMENT_HELP_REQUESTED",
  "ADVANCE_WITHOUT_PAYMENT",
]);

export function requestEventLabel(eventType: string) {
  return REQUEST_EVENT_LABELS[eventType] || eventType.replace(/_/g, " ").toLowerCase();
}

export function isCustomerOriginatedEvent(eventType: string) {
  return CUSTOMER_EVENT_TYPES.has(eventType);
}
