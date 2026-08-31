export const REQUEST_FLOW_STATUSES = [
  "RECEIVED",
  "SOURCING",
  "QUOTED",
  "AWAITING_DECISION",
  "ACCEPTED",
  "SHIPPING",
  "COMPLETED",
] as const;

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Recibida",
  SOURCING: "En gestión",
  QUOTED: "Cotizada",
  AWAITING_DECISION: "Esperando respuesta",
  ACCEPTED: "Aceptada",
  SHIPPING: "En despacho",
  COMPLETED: "Finalizada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
};

export const REQUEST_STATUS_DESCRIPTIONS: Record<string, string> = {
  RECEIVED: "Tu solicitud fue ingresada y está a la espera de gestión.",
  SOURCING: "Un ejecutivo responsable gestiona alternativas para tu solicitud.",
  QUOTED: "La cotización fue creada y está lista para ser enviada.",
  AWAITING_DECISION: "La cotización fue enviada y esperamos la respuesta del cliente.",
  ACCEPTED: "La cotización fue aceptada y el pago fue confirmado.",
  SHIPPING: "El medicamento está en proceso de despacho o envío.",
  COMPLETED: "El proceso de la solicitud fue finalizado.",
  REJECTED: "La solicitud o cotización fue rechazada.",
  CANCELLED: "La solicitud fue cancelada.",
};