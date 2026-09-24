import { REQUEST_STATUS_LABELS } from "@/lib/request-status";

export type ShippingStartInput = {
  requestStatus: string;
  hasPaid: boolean;
  estimatedDeliveryDate: unknown;
  shippingMethod: unknown;
};

export function formatDeliveryDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "UTC" }).format(date);
}

export function buildShippingNote(input: { estimatedDeliveryDate: string; shippingMethod: string }): string {
  return [
    "Despacho iniciado.",
    `Fecha estimada de entrega: ${formatDeliveryDate(input.estimatedDeliveryDate)}.`,
    `Forma de envío: ${input.shippingMethod}.`,
    "La fecha y la coordinación pueden modificarse por retrasos, disponibilidad u otros inconvenientes externos.",
  ].join("\n");
}

export function validateShippingStart(input: ShippingStartInput): { ok: true; estimatedDeliveryDate: string; shippingMethod: string } | { ok: false; error: string } {
  if (input.requestStatus !== "PAID" && !(input.requestStatus === "ACCEPTED" && input.hasPaid)) {
    return { ok: false, error: `La solicitud debe estar en ${REQUEST_STATUS_LABELS.PAID} (pago confirmado) para iniciar el despacho.` };
  }
  if (!input.hasPaid) {
    return { ok: false, error: "No se puede iniciar el despacho: la cotización aceptada aún no registra un pago confirmado." };
  }
  const estimatedDeliveryDate = typeof input.estimatedDeliveryDate === "string" ? input.estimatedDeliveryDate.trim() : "";
  const shippingMethod = typeof input.shippingMethod === "string" ? input.shippingMethod.trim() : "";
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(estimatedDeliveryDate) && !Number.isNaN(Date.parse(`${estimatedDeliveryDate}T12:00:00Z`));
  if (!validDate) return { ok: false, error: "Indica una fecha estimada de entrega válida." };
  if (!shippingMethod) return { ok: false, error: "Indica la forma de envío." };
  if (shippingMethod.length > 120) return { ok: false, error: "La forma de envío no puede superar 120 caracteres." };
  return { ok: true, estimatedDeliveryDate, shippingMethod };
}
