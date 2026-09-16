import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { summarizeRequestProducts } from "../../lib/portal/request-summary";

describe("resumen de productos en el listado del portal", () => {
  it("usa el nombre del medicamento o dispositivo cuando hay uno", () => {
    assert.equal(
      summarizeRequestProducts({
        productType: "MEDICATION",
        medications: [{ commercialName: "Keytruda" }],
        medicalDevices: [],
      }),
      "Keytruda",
    );
    assert.equal(
      summarizeRequestProducts({
        productType: "MEDICAL_DEVICE",
        medications: [],
        medicalDevices: [{ name: "Bomba de infusión" }],
      }),
      "Bomba de infusión",
    );
  });

  it("resume varios productos sin saturar la tabla", () => {
    assert.equal(
      summarizeRequestProducts({
        productType: "MEDICATION",
        medications: [{ commercialName: "Keytruda" }, { commercialName: "Opdivo" }],
        medicalDevices: [],
      }),
      "Keytruda y Opdivo",
    );
    assert.equal(
      summarizeRequestProducts({
        productType: "MEDICATION",
        medications: [{ commercialName: "A" }, { commercialName: "B" }, { commercialName: "C" }],
        medicalDevices: [],
      }),
      "A y 2 más",
    );
  });

  it("cae al tipo de producto cuando no hay nombres", () => {
    assert.equal(
      summarizeRequestProducts({
        productType: "MEDICATION",
        medications: [],
        medicalDevices: [],
      }),
      "Medicamento",
    );
  });
});
