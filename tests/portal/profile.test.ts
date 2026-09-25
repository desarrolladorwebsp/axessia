import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { DomainError } from "../../lib/domain-error";
import { hasBlockedProfileField, parsePortalProfileUpdate } from "../../lib/portal/profile";

describe("actualización de perfil", () => {
  it("acepta nombre, teléfono, ciudad y consentimiento", () => {
    const parsed = parsePortalProfileUpdate({
      name: "  Ana  Pérez ",
      phone: "+56 9 1234 5678",
      city: "Santiago",
      promotionsConsent: true,
    });
    assert.equal(parsed.name, "Ana Pérez");
    assert.equal(parsed.phone, "+56 9 1234 5678");
    assert.equal(parsed.city, "Santiago");
    assert.equal(parsed.promotionsConsent, true);
  });

  it("rechaza correo, RUT, contraseña e identificadores", () => {
    assert.equal(hasBlockedProfileField({ email: "otro@axessia.cl" }), true);
    assert.equal(hasBlockedProfileField({ rut: "11111111-1" }), true);
    assert.equal(hasBlockedProfileField({ password: "Secret123" }), true);
    assert.equal(hasBlockedProfileField({ id: "customer-b" }), true);
    assert.throws(
      () => parsePortalProfileUpdate({
        name: "Ana",
        phone: "+56912345678",
        city: "Santiago",
        promotionsConsent: true,
        email: "otro@axessia.cl",
      }),
      (error: unknown) => error instanceof DomainError && error.status === 400,
    );
  });

  it("valida campos vacíos o demasiado cortos", () => {
    assert.throws(
      () => parsePortalProfileUpdate({ name: "", phone: "123", city: "Santiago", promotionsConsent: false }),
      DomainError,
    );
    assert.throws(
      () => parsePortalProfileUpdate({ name: "Ana", phone: "123", city: "Santiago", promotionsConsent: false }),
      DomainError,
    );
  });
});
