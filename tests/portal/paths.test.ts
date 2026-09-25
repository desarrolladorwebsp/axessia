import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { PORTAL_HOME_PATH, PORTAL_PROFILE_PATH, portalHomePath, portalRequestDetailPath } from "../../lib/portal/paths";

describe("rutas del portal centradas en solicitudes", () => {
  it("mantiene el listado en la home y el perfil fuera de las pestañas", () => {
    assert.equal(PORTAL_HOME_PATH, "/mi-cuenta");
    assert.equal(PORTAL_PROFILE_PATH, "/mi-cuenta/perfil");
    assert.equal(portalHomePath(), "/mi-cuenta");
    assert.equal(portalHomePath("1"), "/mi-cuenta");
    assert.equal(portalHomePath("2"), "/mi-cuenta?page=2");
  });

  it("deja el perfil como destino secundario, no como módulo de navegación", () => {
    assert.equal(PORTAL_PROFILE_PATH.startsWith(PORTAL_HOME_PATH), true);
    assert.notEqual(PORTAL_PROFILE_PATH, PORTAL_HOME_PATH);
    assert.equal(PORTAL_PROFILE_PATH, "/mi-cuenta/perfil");
  });

  it("lleva el retorno de pago y los enlaces de cotización al detalle de la solicitud", () => {
    assert.equal(portalRequestDetailPath("req-1"), "/mi-cuenta/solicitudes/req-1");
    assert.equal(portalRequestDetailPath("req-1", "return"), "/mi-cuenta/solicitudes/req-1?payment=return");
    assert.equal(portalRequestDetailPath("id with space", "return"), "/mi-cuenta/solicitudes/id%20with%20space?payment=return");
  });
});
