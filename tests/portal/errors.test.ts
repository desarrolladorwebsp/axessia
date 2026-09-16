import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DomainError, isDomainError } from "../../lib/domain-error";
import { parsePage, paginationMeta } from "../../lib/portal/pagination";

describe("errores y paginación", () => {
  it("normaliza páginas inválidas", () => {
    assert.equal(parsePage("2"), 2);
    assert.equal(parsePage("0"), 1);
    assert.equal(parsePage("-3"), 1);
    assert.equal(parsePage("abc"), 1);
  });

  it("calcula metadatos de paginación", () => {
    assert.deepEqual(paginationMeta(45, 2, 20), { total: 45, page: 2, limit: 20, pages: 3 });
    assert.deepEqual(paginationMeta(0, 1, 20), { total: 0, page: 1, limit: 20, pages: 1 });
  });

  it("distingue errores de dominio para autorización y negocio", () => {
    const unauthorized = new DomainError("No autorizado.", 401);
    const missing = new DomainError("Recurso no encontrado.", 404);
    assert.equal(isDomainError(unauthorized), true);
    assert.equal(unauthorized.status, 401);
    assert.equal(missing.status, 404);
    assert.equal(isDomainError(new Error("boom")), false);
  });
});
