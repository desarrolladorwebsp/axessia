import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { evaluateQuoteDecision } from "../../lib/quote-decision";
import { CUSTOMER_VISIBLE_QUOTE_STATUSES, isCustomerVisibleQuoteStatus } from "../../lib/quote-status";

describe("cotizaciones del portal", () => {
  it("permite aceptar o rechazar solo una cotización SENT en AWAITING_DECISION", () => {
    const result = evaluateQuoteDecision({
      requestStatus: "AWAITING_DECISION",
      quoteStatus: "SENT",
      validUntil: new Date(Date.now() + 86_400_000),
    });
    assert.equal(result.allowed, true);
  });

  it("bloquea una segunda aceptación o rechazo cuando ya no está SENT", () => {
    const accepted = evaluateQuoteDecision({
      requestStatus: "ACCEPTED",
      quoteStatus: "ACCEPTED",
    });
    const rejected = evaluateQuoteDecision({
      requestStatus: "REJECTED",
      quoteStatus: "REJECTED",
    });
    assert.equal(accepted.allowed, false);
    assert.equal(rejected.allowed, false);
    if (!accepted.allowed) assert.equal(accepted.status, 409);
    if (!rejected.allowed) assert.equal(rejected.status, 409);
  });

  it("marca como vencida una cotización SENT con validUntil pasado", () => {
    const result = evaluateQuoteDecision({
      requestStatus: "AWAITING_DECISION",
      quoteStatus: "SENT",
      validUntil: new Date(Date.now() - 1000),
    });
    assert.equal(result.allowed, false);
    if (!result.allowed) {
      assert.equal(result.expired, true);
      assert.equal(result.status, 409);
    }
  });

  it("oculta borradores y cotizaciones no enviadas al cliente", () => {
    assert.equal(isCustomerVisibleQuoteStatus("DRAFT"), false);
    assert.equal(isCustomerVisibleQuoteStatus("READY"), false);
    assert.deepEqual([...CUSTOMER_VISIBLE_QUOTE_STATUSES], ["SENT", "ACCEPTED", "REJECTED", "EXPIRED", "VOIDED"]);
  });
});
