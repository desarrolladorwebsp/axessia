import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { portalLoginPath, safePortalNextPath } from "../../lib/portal/login-redirect";

describe("redirección segura al portal tras login", () => {
  it("solo permite volver a rutas del portal del cliente", () => {
    assert.equal(safePortalNextPath("/mi-cuenta/cotizaciones/quote-a"), "/mi-cuenta/cotizaciones/quote-a");
    assert.equal(safePortalNextPath("/mi-cuenta"), "/mi-cuenta");
    assert.equal(safePortalNextPath("/app"), null);
    assert.equal(safePortalNextPath("https://evil.com"), null);
    assert.equal(safePortalNextPath("//evil.com"), null);
    assert.equal(safePortalNextPath("/mi-cuenta@evil.com"), null);
    assert.equal(portalLoginPath("/mi-cuenta/cotizaciones/quote-a"), "/ingresar?next=%2Fmi-cuenta%2Fcotizaciones%2Fquote-a");
  });
});
