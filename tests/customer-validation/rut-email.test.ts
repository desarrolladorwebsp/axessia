import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { isValidRut, normalizeCustomerName, normalizeEmail, normalizeRut } from "../../lib/customer-validation";

describe("registro de cliente: normalización y validación de RUT", () => {
  it("normaliza puntos, espacios y guion a un formato NUMERO-VERIFICADOR", () => {
    assert.equal(normalizeRut("12.345.678-5"), "12345678-5");
    assert.equal(normalizeRut("12345678k"), "12345678-K");
    assert.equal(normalizeRut("7.654.321-6"), "7654321-6");
  });

  it("retorna vacío para entradas vacías o sin dígitos", () => {
    assert.equal(normalizeRut(""), "");
    assert.equal(normalizeRut("   "), "");
    assert.equal(normalizeRut("abc"), "");
  });

  it("valida correctamente RUT chilenos con dígito verificador correcto", () => {
    assert.equal(isValidRut("12345678-5"), true);
    assert.equal(isValidRut("12.345.678-5"), true);
  });

  it("rechaza RUT con dígito verificador incorrecto", () => {
    assert.equal(isValidRut("12345678-9"), false);
  });

  it("rechaza RUT demasiado corto, largo o inválido", () => {
    assert.equal(isValidRut("1-9"), false);
    assert.equal(isValidRut("123456789012-3"), false);
    assert.equal(isValidRut(""), false);
    assert.equal(isValidRut("no-es-un-rut"), false);
  });
});

describe("registro de cliente: normalización de correo y nombre", () => {
  it("normaliza el correo a minúsculas y sin espacios", () => {
    assert.equal(normalizeEmail("  Ana.Perez@Correo.CL  "), "ana.perez@correo.cl");
  });

  it("colapsa espacios múltiples en el nombre y recorta extremos", () => {
    assert.equal(normalizeCustomerName("  Ana   Perez  "), "Ana Perez");
    assert.equal(normalizeCustomerName(""), "");
  });
});
