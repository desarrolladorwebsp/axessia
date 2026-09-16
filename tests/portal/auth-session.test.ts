import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCustomerSessionToken, verifyCustomerSessionToken } from "../../lib/auth";

describe("autenticación del portal", () => {
  it("identifica al cliente solo desde el token de sesión", () => {
    const token = createCustomerSessionToken("customer-a");
    const session = verifyCustomerSessionToken(token);
    assert.equal(session?.customerId, "customer-a");
  });

  it("no permite que un token de A se interprete como B", () => {
    const token = createCustomerSessionToken("customer-a");
    const session = verifyCustomerSessionToken(token);
    assert.notEqual(session?.customerId, "customer-b");
  });

  it("rechaza tokens ausentes, truncados o firmas inválidas", () => {
    assert.equal(verifyCustomerSessionToken(), null);
    assert.equal(verifyCustomerSessionToken(""), null);
    assert.equal(verifyCustomerSessionToken("not-a-token"), null);
    const token = createCustomerSessionToken("customer-a");
    const [payload] = token.split(".");
    assert.equal(verifyCustomerSessionToken(`${payload}.deadbeef`), null);
  });
});
