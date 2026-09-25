import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { payableAmountFromQuoteTotal } from "../../lib/payments";
import { evaluateQuoteDecision } from "../../lib/quote-decision";

describe("pagos del portal", () => {
  it("obtiene el monto solo desde el total de la cotización almacenada", () => {
    const payable = payableAmountFromQuoteTotal("125000.50");
    assert.deepEqual(payable, { amount: "125000.50", amountTotal: 125001 });
  });

  it("ignora montos inválidos o no positivos enviados como si fueran de cotización", () => {
    assert.equal(payableAmountFromQuoteTotal(null), null);
    assert.equal(payableAmountFromQuoteTotal(undefined), null);
    assert.equal(payableAmountFromQuoteTotal("0"), null);
    assert.equal(payableAmountFromQuoteTotal("-10"), null);
    assert.equal(payableAmountFromQuoteTotal("abc"), null);
  });

  it("no permite iniciar un pago si la cotización no está aceptada", () => {
    const result = evaluateQuoteDecision({
      requestStatus: "AWAITING_DECISION",
      quoteStatus: "SENT",
    });
    assert.equal(result.allowed, true);
    const unpaid = evaluateQuoteDecision({
      requestStatus: "SOURCING",
      quoteStatus: "SENT",
    });
    assert.equal(unpaid.allowed, false);
  });
});
