import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { parseMedicalDeviceItems, parseMedicationItems } from "../../lib/product-type";

describe("creación de solicitud: campos obligatorios de medicamentos", () => {
  it("exige al menos un medicamento", () => {
    assert.throws(() => parseMedicationItems([]), /Agrega al menos un medicamento/);
    assert.throws(() => parseMedicationItems(undefined), /Agrega al menos un medicamento/);
  });

  it("exige nombre comercial, principio activo y concentración", () => {
    assert.throws(
      () => parseMedicationItems([{ commercialName: "", activeIngredient: "Paracetamol", concentration: "500mg" }]),
      /Medicamento 1 incompleto/,
    );
    assert.throws(
      () => parseMedicationItems([{ commercialName: "Panadol", activeIngredient: "", concentration: "500mg" }]),
      /Medicamento 1 incompleto/,
    );
  });

  it("acepta un medicamento completo y recorta las notas a 500 caracteres", () => {
    const [medication] = parseMedicationItems([
      {
        commercialName: " Panadol ",
        activeIngredient: " Paracetamol ",
        concentration: " 500mg ",
        tabletQuantity: "20",
        notes: "x".repeat(600),
      },
    ]);
    assert.equal(medication.commercialName, "Panadol");
    assert.equal(medication.tabletQuantity, 20);
    assert.equal(medication.notes?.length, 500);
  });

  it("rechaza una cantidad de comprimidos inválida (cero, negativa o no numérica)", () => {
    const base = { commercialName: "Panadol", activeIngredient: "Paracetamol", concentration: "500mg" };
    assert.throws(() => parseMedicationItems([{ ...base, tabletQuantity: 0 }]), /Medicamento 1 incompleto/);
    assert.throws(() => parseMedicationItems([{ ...base, tabletQuantity: -5 }]), /Medicamento 1 incompleto/);
    assert.throws(() => parseMedicationItems([{ ...base, tabletQuantity: "no-numero" }]), /Medicamento 1 incompleto/);
  });
});

describe("creación de solicitud: campos obligatorios de dispositivos médicos", () => {
  it("exige al menos un dispositivo", () => {
    assert.throws(() => parseMedicalDeviceItems([]), /Agrega al menos un dispositivo médico/);
  });

  it("exige el nombre del dispositivo", () => {
    assert.throws(() => parseMedicalDeviceItems([{ name: "" }]), /Dispositivo 1 incompleto/);
  });

  it("acepta un dispositivo con marca, modelo y cantidad opcionales", () => {
    const [device] = parseMedicalDeviceItems([{ name: "Silla de ruedas", brand: "Drive", model: "X100", quantity: "2" }]);
    assert.equal(device.name, "Silla de ruedas");
    assert.equal(device.brand, "Drive");
    assert.equal(device.quantity, 2);
  });

  it("rechaza una cantidad inválida cuando se especifica", () => {
    assert.throws(() => parseMedicalDeviceItems([{ name: "Bastón", quantity: 0 }]), /Dispositivo 1 incompleto/);
  });
});
