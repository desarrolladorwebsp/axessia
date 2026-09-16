import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateResetToken, hashPassword, hashResetToken, isValidResetTokenFormat, validatePassword } from "../../lib/password";
import { buildPasswordResetUrl } from "../../lib/services/password-reset";
import { renderCustomerPasswordResetEmail } from "../../lib/services/customer-notification-emails";

describe("recuperación de contraseña del cliente", () => {
  it("genera un token opaco de 64 hex y lo guarda hasheado, no en texto plano", () => {
    const token = generateResetToken();
    assert.equal(isValidResetTokenFormat(token), true);
    const hashed = hashResetToken(token);
    assert.equal(hashed, hashResetToken(token));
    assert.notEqual(hashed, token);
    assert.equal(hashed.includes(token), false);
    assert.notEqual(hashResetToken(generateResetToken()), hashed);
  });

  it("exige confirmación de política de contraseña y cifra con bcrypt", async () => {
    assert.equal(validatePassword("short"), "La contraseña debe tener 8 caracteres, mayúscula, minúscula y número.");
    assert.equal(validatePassword("Password1"), null);
    const hashed = await hashPassword("Password1");
    assert.match(hashed, /^\$2[aby]?\$/);
    assert.notEqual(hashed, "Password1");
  });

  it("arma el enlace de restablecimiento sin exponer el hash", () => {
    const previousApp = process.env.APP_URL;
    process.env.APP_URL = "https://axessia.cl";
    try {
      const token = "a".repeat(64);
      const url = buildPasswordResetUrl(token);
      assert.equal(url, `https://axessia.cl/restablecer-contrasena?token=${token}`);
      assert.doesNotMatch(url, /tokenHash/);
    } finally {
      if (previousApp === undefined) delete process.env.APP_URL;
      else process.env.APP_URL = previousApp;
    }
  });

  it("el correo de recuperación usa la identidad AXESSIA y no incluye secretos", () => {
    const html = renderCustomerPasswordResetEmail({
      customerName: "Ana Pérez",
      resetUrl: "https://axessia.cl/restablecer-contrasena?token=abc123",
    });
    assert.match(html, /AXESSIA/);
    assert.match(html, /Portal del cliente/);
    assert.match(html, /Crear nueva contraseña/);
    assert.match(html, /#00A6D9/);
    assert.match(html, /#087FD5/);
    assert.match(html, /#7A28D8/);
    assert.match(html, /https:\/\/axessia\.cl\/restablecer-contrasena\?token=abc123/);
    assert.match(html, /copia y pega este enlace/);
    assert.match(html, /no-reply@axessia\.cl|AXESSIA/);
    assert.doesNotMatch(html, /passwordHash/);
    assert.doesNotMatch(html, /tokenHash/);
    assert.doesNotMatch(html, /RUT/i);
  });
});
