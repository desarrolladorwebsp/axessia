import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { REQUEST_STATUS_LABELS } from "../../lib/request-status";
import { requestEventLabel } from "../../lib/request-events";

describe("historial y despacho", () => {
  it("expone etiquetas reales de estado incluyendo despacho", () => {
    assert.equal(REQUEST_STATUS_LABELS.SHIPPING, "En despacho");
    assert.equal(REQUEST_STATUS_LABELS.ACCEPTED, "Aceptada");
    assert.equal(REQUEST_STATUS_LABELS.COMPLETED, "Finalizada");
  });

  it("mapea eventos de avance, pago y despacho del historial existente", () => {
    assert.equal(requestEventLabel("SHIPPING_STARTED"), "Despacho iniciado");
    assert.equal(requestEventLabel("QUOTE_ACCEPTED"), "Cotización aceptada");
    assert.equal(requestEventLabel("QUOTE_REJECTED"), "Cotización rechazada");
    assert.equal(requestEventLabel("PAYMENT_CONFIRMED"), "Pago confirmado");
    assert.equal(requestEventLabel("REQUEST_COMPLETED"), "Solicitud finalizada");
    assert.equal(requestEventLabel("QUOTE_PENDING_REMINDER_SENT"), "Recordatorio de cotización enviado");
    assert.equal(requestEventLabel("QUOTE_EXPIRING_SOON_SENT"), "Aviso de vencimiento de cotización enviado");
    assert.equal(requestEventLabel("REQUEST_COMPLETED_EMAIL_SENT"), "Aviso de solicitud finalizada enviado");
  });
});
