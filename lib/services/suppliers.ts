import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/domain-error";
import {
  assertSupplierDeletable,
  blockingRelationsFromCounts,
  parseSupplierId,
  parseSupplierInput,
  prismaErrorCode,
  serializeSupplier,
  type SupplierRecord,
  type SupplierRelationCounts,
} from "@/lib/supplier-validation";

export const supplierSelect = {
  id: true,
  name: true,
  identifier: true,
  phone: true,
  contactName: true,
  email: true,
  manufacturer: true,
  originCountry: true,
  country: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SupplierSelect;

export type SupplierStore = {
  supplier: {
    findMany: typeof prisma.supplier.findMany;
    count: typeof prisma.supplier.count;
    findUnique: typeof prisma.supplier.findUnique;
    create: typeof prisma.supplier.create;
    update: typeof prisma.supplier.update;
    delete: typeof prisma.supplier.delete;
  };
};

function notFound(): never {
  throw new DomainError("Proveedor no encontrado.", 404);
}

function rethrowSupplierWriteError(error: unknown): never {
  const code = prismaErrorCode(error);
  if (code === "P2025") notFound();
  if (code === "P2003" || code === "P2014") {
    throw new DomainError("No es posible eliminar el proveedor porque tiene registros asociados.", 409);
  }
  throw error;
}

export async function countSupplierRelations(
  supplierId: string,
): Promise<SupplierRelationCounts> {
  const quotes = await prisma.quoteItem.count({ where: { supplierId } });
  return { purchases: 0, quotes, cases: 0 };
}

export async function listQuoteSuppliers(store: SupplierStore = prisma) {
  const suppliers = await store.supplier.findMany({
    where: {},
    select: {
      id: true,
      name: true,
      manufacturer: true,
      originCountry: true,
      country: true,
    },
    orderBy: { name: "asc" },
    take: 200,
  });

  return {
    suppliers: suppliers.map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      manufacturer: supplier.manufacturer ?? null,
      originCountry: supplier.originCountry ?? null,
      country: supplier.country ?? null,
    })),
  };
}

export async function listSuppliers(
  params: { where: Prisma.SupplierWhereInput; page: number; limit: number },
  store: SupplierStore = prisma,
) {
  const skip = (params.page - 1) * params.limit;
  const where = params.where;
  const emailFilter = { AND: [where, { email: { not: null } }] };
  const phoneFilter = { AND: [where, { phone: { not: null } }] };
  const identifierFilter = { AND: [where, { identifier: { not: null } }] };

  const [suppliers, total, withEmail, withPhone, withIdentifier] = await Promise.all([
    store.supplier.findMany({
      where,
      select: supplierSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: params.limit,
    }),
    store.supplier.count({ where }),
    store.supplier.count({ where: emailFilter }),
    store.supplier.count({ where: phoneFilter }),
    store.supplier.count({ where: identifierFilter }),
  ]);

  return {
    suppliers: suppliers.map((supplier) => serializeSupplier(supplier as SupplierRecord)),
    summary: {
      total,
      withEmail,
      withPhone,
      withIdentifier,
    },
    pagination: {
      total,
      page: params.page,
      limit: params.limit,
      pages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

export async function getSupplier(idValue: unknown, store: SupplierStore = prisma) {
  const id = parseSupplierId(idValue);
  const supplier = await store.supplier.findUnique({
    where: { id },
    select: supplierSelect,
  });
  if (!supplier) notFound();
  return serializeSupplier(supplier as SupplierRecord);
}

export async function createSupplier(payload: unknown, store: SupplierStore = prisma) {
  const data = parseSupplierInput(payload);
  const supplier = await store.supplier.create({
    data,
    select: supplierSelect,
  });
  return serializeSupplier(supplier as SupplierRecord);
}

export async function updateSupplier(idValue: unknown, payload: unknown, store: SupplierStore = prisma) {
  const id = parseSupplierId(idValue);
  const data = parseSupplierInput(payload);
  const existing = await store.supplier.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) notFound();

  try {
    const supplier = await store.supplier.update({
      where: { id },
      data,
      select: supplierSelect,
    });
    return serializeSupplier(supplier as SupplierRecord);
  } catch (error) {
    rethrowSupplierWriteError(error);
  }
}

export async function deleteSupplier(
  idValue: unknown,
  options?: {
    store?: SupplierStore;
    countRelations?: (supplierId: string) => Promise<SupplierRelationCounts>;
  },
) {
  const id = parseSupplierId(idValue);
  const store = options?.store ?? prisma;
  const existing = await store.supplier.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) notFound();

  const counts = await (options?.countRelations ?? countSupplierRelations)(id);
  assertSupplierDeletable(blockingRelationsFromCounts(counts));

  try {
    await store.supplier.delete({ where: { id } });
  } catch (error) {
    rethrowSupplierWriteError(error);
  }

  return { id };
}
