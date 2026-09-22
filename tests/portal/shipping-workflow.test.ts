import assert from "node:assert/strict";
import test from "node:test";
import { buildShippingNote, validateShippingStart } from "../../lib/shipping";
import { renderShippingStartedEmail } from "../../lib/services/customer-notification-emails";

test("no permite iniciar despacho sin pago confirmado", () => {
  const result = validateShippingStart({ requestStatus: "ACCEPTED", hasPaid: false, estimatedDeliveryDate: "2026-09-20", shippingMethod: "Courier" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /pago confirmado/i);
});

test("exige fecha y método al iniciar despacho pagado", () => {
  const result = validateShippingStart({ requestStatus: "ACCEPTED", hasPaid: true, estimatedDeliveryDate: "", shippingMethod: "" });
  assert.equal(result.ok, false);
});

test("la nota de despacho concentra los datos sin campos dedicados", () => {
  const note = buildShippingNote({ estimatedDeliveryDate: "2026-09-20", shippingMethod: "Courier" });
  assert.match(note, /20 de septiembre de 2026/i);
  assert.match(note, /Courier/);
  assert.match(note, /inconvenientes externos/i);
});

test("el correo de despacho informa fecha, método y carácter referencial", () => {
  const html = renderShippingStartedEmail({ customerName: "Alfredo", requestNumber: "AX-123", estimatedDeliveryDate: "20 de septiembre de 2026", shippingMethod: "Courier", requestUrl: "https://axessia.cl/seguimiento/AX-123" });
  assert.match(html, /20 de septiembre de 2026/);
  assert.match(html, /Courier/);
  assert.match(html, /inconvenientes externos/i);
});
