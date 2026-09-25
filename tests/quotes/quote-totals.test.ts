import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { computeQuoteTotal, parseQuoteItems } from "../../lib/quote-items";
import { IVA_RATE, quotePriceBreakdownFromItems, quotePriceBreakdownFromSubtotal } from "../../lib/quote-pricing";

describe("totales de cotización con IVA", () => {
  it("usa una tasa de IVA de 19%", () => {
    assert.equal(IVA_RATE, 0.19);
  });

  it("agrega el IVA sobre el neto y redondea a peso entero", () => {
    assert.deepEqual(quotePriceBreakdownFromSubtotal(45000), { subtotal: 45000, iva: 8550, total: 53550 });
    // 1.999 * 0.19 = 379,81 → el IVA se redondea, nunca se trunca.
    assert.deepEqual(quotePriceBreakdownFromSubtotal(1999), { subtotal: 1999, iva: 380, total: 2379 });
    assert.deepEqual(quotePriceBreakdownFromSubtotal(0), { subtotal: 0, iva: 0, total: 0 });
  });

  it("persiste el total con IVA incluido a partir de las líneas", () => {
    const items = parseQuoteItems(
      [
        { productName: "Paracetamol", quantity: 1, unitPrice: 45000, supplierId: "sup-1" },
        { productName: "Ibuprofeno", quantity: 2, unitPrice: 5000, supplierId: "sup-1" },
      ],
      false,
    );
    // Las líneas se guardan netas y el total de la cotización con impuesto.
    assert.equal(items[0]?.totalPrice, 45000);
    assert.equal(items[1]?.totalPrice, 10000);
    assert.equal(computeQuoteTotal(items), 65450);
  });

  it("no calcula total cuando ningún producto tiene precio", () => {
    assert.equal(computeQuoteTotal(parseQuoteItems([{ productName: "Sin precio" }], true)), null);
  });

  it("suma los montos de línea e incorpora IVA", () => {
    assert.deepEqual(
      quotePriceBreakdownFromItems([{ totalPrice: "45000" }, { totalPrice: 10000 }, { totalPrice: null }]),
      { subtotal: 55000, iva: 10450, total: 65450 },
    );
  });
});
