import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { DomainError } from "../../lib/domain-error";
import { ownedByCustomer } from "../../lib/portal/ownership";
import { ownedResourceWhere, resourceBelongsToCustomer, scopedToCustomer } from "../../lib/portal/scope";

describe("aislamiento entre clientes", () => {
  it("todas las consultas de portal quedan ancladas al customerId de sesión", () => {
    assert.deepEqual(scopedToCustomer("customer-a"), { customerId: "customer-a" });
    assert.deepEqual(ownedResourceWhere("customer-a", "request-1"), { id: "request-1", customerId: "customer-a" });
  });

  it("un cliente A no obtiene recursos del cliente B aunque conozca el ID", () => {
    assert.equal(resourceBelongsToCustomer("customer-b", "customer-a"), false);
    assert.throws(
      () => ownedByCustomer({ customerId: "customer-b" }, "customer-a"),
      (error: unknown) => error instanceof DomainError && error.status === 404,
    );
  });

  it("un recurso sin dueño o de otro cliente responde como no encontrado", () => {
    assert.throws(
      () => ownedByCustomer({ customerId: null }, "customer-a"),
      (error: unknown) => error instanceof DomainError && error.status === 404,
    );
    assert.throws(
      () => ownedByCustomer(null, "customer-a"),
      (error: unknown) => error instanceof DomainError && error.status === 404,
    );
  });

  it("no autoriza con customerId vacío enviado por el cliente", () => {
    assert.throws(
      () => scopedToCustomer(""),
      (error: unknown) => error instanceof DomainError && error.status === 401,
    );
  });

  it("sí autoriza cuando el recurso pertenece al cliente autenticado", () => {
    const resource = ownedByCustomer({ customerId: "customer-a", id: "quote-1" }, "customer-a");
    assert.equal(resource.id, "quote-1");
    assert.equal(resourceBelongsToCustomer("customer-a", "customer-a"), true);
  });
});
