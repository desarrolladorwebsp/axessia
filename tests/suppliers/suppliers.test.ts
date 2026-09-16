import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DomainError } from "../../lib/domain-error";
import {
  assertInternalSupplierAccess,
  assertSupplierDeletable,
  blockingRelationsFromCounts,
  buildSupplierSearchWhere,
  parseSupplierId,
  parseSupplierInput,
  parseSupplierListParams,
  prismaErrorCode,
  publicSupplierError,
  serializeSupplier,
} from "../../lib/supplier-validation";
import {
  createSupplier,
  deleteSupplier,
  getSupplier,
  listSuppliers,
  updateSupplier,
  type SupplierStore,
} from "../../lib/services/suppliers";
import { createMemorySupplierStore } from "./helpers";

const validPayload = {
  name: "  Pharma  Global  ",
  identifier: " DE-998877 ",
  phone: "+49 30 123456",
  contactName: "Anna Schmidt",
  email: "  Contact@Pharma-Global.de ",
  notes: "Proveedor habitual de especialidades.",
};

function asStore(store: ReturnType<typeof createMemorySupplierStore>): SupplierStore {
  return store as unknown as SupplierStore;
}

describe("validación de proveedores", () => {
  it("crea un payload válido normalizando espacios y correo", () => {
    const parsed = parseSupplierInput(validPayload);
    assert.equal(parsed.name, "Pharma Global");
    assert.equal(parsed.identifier, "DE-998877");
    assert.equal(parsed.email, "contact@pharma-global.de");
    assert.equal(parsed.contactName, "Anna Schmidt");
    assert.equal(parsed.manufacturer, null);
    assert.equal(parsed.originCountry, null);
    assert.equal(parsed.country, null);
  });

  it("exige el nombre del proveedor", () => {
    assert.throws(
      () => parseSupplierInput({ ...validPayload, name: "   " }),
      (error: unknown) => error instanceof DomainError && error.status === 400 && error.message.includes("nombre"),
    );
  });

  it("valida el correo solo cuando existe", () => {
    const withoutEmail = parseSupplierInput({ ...validPayload, email: "" });
    assert.equal(withoutEmail.email, null);
    assert.throws(
      () => parseSupplierInput({ ...validPayload, email: "correo-invalido" }),
      (error: unknown) => error instanceof DomainError && error.status === 400 && error.message.includes("correo"),
    );
  });

  it("acepta laboratorio, país de origen y país del proveedor", () => {
    const parsed = parseSupplierInput({
      ...validPayload,
      manufacturer: "  Bayer  ",
      originCountry: " Alemania ",
      country: " Chile ",
    });
    assert.equal(parsed.manufacturer, "Bayer");
    assert.equal(parsed.originCountry, "Alemania");
    assert.equal(parsed.country, "Chile");
  });

  it("acepta un número/ID extranjero sin tratarlo como RUT chileno", () => {
    const parsed = parseSupplierInput({
      name: "Midwest Specialty",
      identifier: "EIN 98-1234567",
    });
    assert.equal(parsed.identifier, "EIN 98-1234567");
    assert.equal(parsed.phone, null);
    assert.equal(parsed.email, null);
  });

  it("rechaza un cuerpo inválido y un id vacío", () => {
    assert.throws(() => parseSupplierInput(null), DomainError);
    assert.throws(() => parseSupplierInput("proveedor"), DomainError);
    assert.throws(() => parseSupplierId("  "), (error: unknown) => error instanceof DomainError && error.status === 400);
    assert.throws(
      () => parseSupplierInput({ ...validPayload, notes: "x".repeat(501) }),
      (error: unknown) => error instanceof DomainError && error.status === 400 && error.message.includes("observaciones"),
    );
  });
});

describe("búsqueda y autorización de proveedores", () => {
  it("busca por nombre, número/ID, responsable y correo", () => {
    const where = buildSupplierSearchWhere("acme");
    assert.deepEqual(where.OR, [
      { name: { contains: "acme" } },
      { identifier: { contains: "acme" } },
      { contactName: { contains: "acme" } },
      { email: { contains: "acme" } },
    ]);
    assert.deepEqual(buildSupplierSearchWhere("  "), {});
  });

  it("pagina listados de forma segura", () => {
    const parsed = parseSupplierListParams(new URLSearchParams("page=0&limit=500&q=Nord"));
    assert.equal(parsed.page, 1);
    assert.equal(parsed.limit, 50);
    assert.equal(parsed.where.OR?.length, 4);
  });

  it("protege acciones sin usuario interno y permite ejecutivos autenticados", () => {
    assert.throws(
      () => assertInternalSupplierAccess(null),
      (error: unknown) => error instanceof DomainError && error.status === 401,
    );
    const actor = assertInternalSupplierAccess({ id: "user-1", role: "EJECUTIVO" });
    assert.equal(actor.id, "user-1");
    assert.equal(assertInternalSupplierAccess({ id: "admin-1", role: "ADMINISTRADOR" }).id, "admin-1");
  });
});

describe("CRUD de proveedores", () => {
  it("crea, lista, obtiene, busca, modifica y elimina un proveedor", async () => {
    const store = asStore(createMemorySupplierStore());
    const created = await createSupplier(validPayload, store);
    assert.equal(created.name, "Pharma Global");
    assert.equal(created.identifier, "DE-998877");
    assert.ok(created.id);

    const listed = await listSuppliers({ where: {}, page: 1, limit: 10 }, store);
    assert.equal(listed.suppliers.length, 1);
    assert.equal(listed.summary.total, 1);
    assert.equal(listed.summary.withEmail, 1);

    const fetched = await getSupplier(created.id, store);
    assert.equal(fetched.email, "contact@pharma-global.de");

    await createSupplier({ name: "Nordic Med", identifier: "NO-12", contactName: "Lars", email: "lars@nordic.test" }, store);
    const searched = await listSuppliers({ where: buildSupplierSearchWhere("nordic"), page: 1, limit: 10 }, store);
    assert.equal(searched.suppliers.length, 1);
    assert.equal(searched.suppliers[0]?.name, "Nordic Med");

    await assert.rejects(
      () => updateSupplier(created.id, { name: "Pharma", email: "mal" }, store),
      (error: unknown) => error instanceof DomainError && error.status === 400,
    );
    const updated = await updateSupplier(created.id, { ...validPayload, phone: "+49 40 111" }, store);
    assert.equal(updated.phone, "+49 40 111");
    assert.notEqual(updated.updatedAt, created.updatedAt);

    const deleted = await deleteSupplier(created.id, {
      store,
      countRelations: async () => ({ purchases: 0, quotes: 0, cases: 0 }),
    });
    assert.equal(deleted.id, created.id);
    await assert.rejects(() => getSupplier(created.id, store), (error: unknown) => error instanceof DomainError && error.status === 404);
  });

  it("rechaza consultar, modificar o eliminar un proveedor inexistente", async () => {
    const store = asStore(createMemorySupplierStore());
    await assert.rejects(
      () => getSupplier("missing-id", store),
      (error: unknown) => error instanceof DomainError && error.status === 404,
    );
    await assert.rejects(
      () => updateSupplier("missing-id", validPayload, store),
      (error: unknown) => error instanceof DomainError && error.status === 404,
    );
    await assert.rejects(
      () => deleteSupplier("missing-id", { store }),
      (error: unknown) => error instanceof DomainError && error.status === 404,
    );
  });

  it("evita una eliminación insegura cuando hay relaciones", async () => {
    const store = asStore(createMemorySupplierStore());
    const created = await createSupplier({ name: "Blocked Supplier" }, store);
    await assert.rejects(
      () => deleteSupplier(created.id, {
        store,
        countRelations: async () => ({ purchases: 2, quotes: 1, cases: 0 }),
      }),
      (error: unknown) => error instanceof DomainError && error.status === 409 && error.message.includes("compras"),
    );
    const stillThere = await getSupplier(created.id, store);
    assert.equal(stillThere.id, created.id);
  });

  it("bloquea el delete si Prisma reporta una restricción referencial", async () => {
    const memory = createMemorySupplierStore();
    const created = await createSupplier({ name: "Linked Supplier" }, asStore(memory));
    const store = asStore({
      supplier: {
        ...memory.supplier,
        delete: async () => {
          throw Object.assign(new Error("Foreign key constraint failed"), { code: "P2003" });
        },
      },
    });
    await assert.rejects(
      () => deleteSupplier(created.id, {
        store,
        countRelations: async () => ({ purchases: 0, quotes: 0, cases: 0 }),
      }),
      (error: unknown) => error instanceof DomainError && error.status === 409 && error.message.includes("registros asociados"),
    );
  });

  it("serializa fechas y construye el mensaje de relaciones bloqueantes", () => {
    const serialized = serializeSupplier({
      id: "sup-1",
      name: "Acme",
      identifier: null,
      phone: null,
      contactName: null,
      email: null,
      manufacturer: null,
      originCountry: null,
      country: null,
      notes: null,
      createdAt: new Date("2026-01-01T12:00:00.000Z"),
      updatedAt: new Date("2026-01-02T12:00:00.000Z"),
    });
    assert.equal(serialized.createdAt, "2026-01-01T12:00:00.000Z");
    assert.equal(serialized.updatedAt, "2026-01-02T12:00:00.000Z");

    const blockers = blockingRelationsFromCounts({ purchases: 1, quotes: 0, cases: 3 });
    assert.equal(blockers.length, 2);
    assert.throws(
      () => assertSupplierDeletable(blockers),
      (error: unknown) => error instanceof DomainError && error.status === 409,
    );
    assert.doesNotThrow(() => assertSupplierDeletable([]));
  });

  it("oculta detalles internos ante errores inesperados", () => {
    const mapped = publicSupplierError(new Error("ECONNREFUSED secret-host:3306"));
    assert.equal(mapped.status, 500);
    assert.equal(mapped.message, "No fue posible completar la operación.");
    assert.equal(mapped.message.includes("ECONNREFUSED"), false);
    const domain = publicSupplierError(new DomainError("Proveedor no encontrado.", 404));
    assert.equal(domain.status, 404);
    assert.equal(domain.message, "Proveedor no encontrado.");
    const invalidJson = publicSupplierError(new SyntaxError("Unexpected token"));
    assert.equal(invalidJson.status, 400);
    const missing = publicSupplierError({ code: "P2025" });
    assert.equal(missing.status, 404);
    const restricted = publicSupplierError({ code: "P2003" });
    assert.equal(restricted.status, 409);
    assert.equal(prismaErrorCode({ code: "P2014" }), "P2014");
  });
});
