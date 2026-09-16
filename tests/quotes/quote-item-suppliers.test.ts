import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyQuoteItemSuppliers, parseQuoteItems } from "../../lib/quote-items";

describe("proveedor por producto de cotización", () => {
  it("exige un proveedor al finalizar y copia laboratorio y países", () => {
    const parsed = parseQuoteItems(
      [{ productName: "Producto A", quantity: 1, unitPrice: 1000, supplierId: "sup-1" }],
      false,
    );
    assert.equal(parsed[0]?.supplierId, "sup-1");
    const applied = applyQuoteItemSuppliers(
      parsed,
      [{ id: "sup-1", manufacturer: "Lab Norte", originCountry: "Alemania", country: "Chile" }],
      false,
    );
    assert.equal(applied[0]?.manufacturer, "Lab Norte");
    assert.equal(applied[0]?.originCountry, "Alemania");
    assert.equal(applied[0]?.supplierCountry, "Chile");
  });

  it("permite borrador sin proveedor y rechaza un id inexistente", () => {
    const draft = parseQuoteItems([{ productName: "Producto A" }], true);
    const withoutSupplier = applyQuoteItemSuppliers(draft, [], true);
    assert.equal(withoutSupplier[0]?.supplierId, null);

    assert.throws(
      () => applyQuoteItemSuppliers(parseQuoteItems([{ productName: "Producto A", quantity: 1, unitPrice: 10 }], false), [], false),
      (error: unknown) => error instanceof Error && error.message.includes("proveedor"),
    );
    assert.throws(
      () =>
        applyQuoteItemSuppliers(
          parseQuoteItems([{ productName: "Producto A", quantity: 1, unitPrice: 10, supplierId: "missing" }], false),
          [{ id: "sup-1", manufacturer: "Lab", originCountry: "Italia", country: "Chile" }],
          false,
        ),
      (error: unknown) => error instanceof Error && error.message.includes("no es válido"),
    );
  });
});
