import { DomainError } from "@/lib/domain-error";
import { normalizeCustomerName, normalizeEmail } from "@/lib/customer-validation";
import { normalizeSearchValue } from "@/lib/search";

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const NAME_MAX = 191;
const IDENTIFIER_MAX = 100;
const PHONE_MAX = 40;
const CONTACT_MAX = 191;
const COUNTRY_MAX = 80;
const NOTES_MAX = 500;

export type SupplierInput = {
  name: string;
  identifier: string | null;
  phone: string | null;
  contactName: string | null;
  email: string | null;
  manufacturer: string | null;
  originCountry: string | null;
  country: string | null;
  notes: string | null;
};

export type SupplierRecord = SupplierInput & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

export type SupplierSearchWhere = {
  OR?: Array<Record<string, { contains: string }>>;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function optionalCollapsed(value: unknown, label: string, max: number): string | null {
  const normalized = normalizeCustomerName(asString(value));
  if (!normalized) return null;
  if (normalized.length > max) {
    throw new DomainError(`El campo ${label} no puede superar ${max} caracteres.`, 400);
  }
  return normalized;
}

export function assertInternalSupplierAccess<T extends { id: string }>(actor: T | null): T {
  if (!actor) throw new DomainError("No autorizado.", 401);
  return actor;
}

export function parseSupplierId(value: unknown): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!id) throw new DomainError("El identificador del proveedor no es válido.", 400);
  return id;
}

export function parseSupplierInput(payload: unknown): SupplierInput {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new DomainError("Los datos del proveedor no son válidos.", 400);
  }

  const data = payload as Record<string, unknown>;
  const name = normalizeCustomerName(asString(data.name));
  if (!name) {
    throw new DomainError("El nombre del proveedor es obligatorio.", 400);
  }
  if (name.length > NAME_MAX) {
    throw new DomainError(`El nombre del proveedor no puede superar ${NAME_MAX} caracteres.`, 400);
  }

  const emailValue = optionalCollapsed(data.email, "correo electrónico", NAME_MAX);
  const email = emailValue ? normalizeEmail(emailValue) : null;
  if (email && !EMAIL_PATTERN.test(email)) {
    throw new DomainError("Revisa el formato del correo electrónico.", 400);
  }

  return {
    name,
    identifier: optionalCollapsed(data.identifier, "número / ID", IDENTIFIER_MAX),
    phone: optionalCollapsed(data.phone, "teléfono", PHONE_MAX),
    contactName: optionalCollapsed(data.contactName, "persona responsable", CONTACT_MAX),
    email,
    manufacturer: optionalCollapsed(data.manufacturer, "laboratorio / fabricante", NAME_MAX),
    originCountry: optionalCollapsed(data.originCountry, "país de origen", COUNTRY_MAX),
    country: optionalCollapsed(data.country, "país del proveedor", COUNTRY_MAX),
    notes: optionalCollapsed(data.notes, "observaciones", NOTES_MAX),
  };
}

export function buildSupplierSearchWhere(query: string | null | undefined): SupplierSearchWhere {
  const normalizedQuery = normalizeSearchValue(query ?? "");
  if (!normalizedQuery) return {};

  return {
    OR: [
      { name: { contains: normalizedQuery } },
      { identifier: { contains: normalizedQuery } },
      { contactName: { contains: normalizedQuery } },
      { email: { contains: normalizedQuery } },
    ],
  };
}

export function parseSupplierListParams(searchParams: URLSearchParams) {
  const requestedPage = Number.parseInt(searchParams.get("page") || "1", 10);
  const requestedLimit = Number.parseInt(searchParams.get("limit") || "10", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 10;

  return {
    page,
    limit,
    query: searchParams.get("q") ?? "",
    where: buildSupplierSearchWhere(searchParams.get("q")),
  };
}

export type SupplierRelationCounts = {
  purchases: number;
  quotes: number;
  cases: number;
};

export type SupplierBlockingRelation = {
  key: keyof SupplierRelationCounts;
  label: string;
  count: number;
};

export function blockingRelationsFromCounts(counts: SupplierRelationCounts): SupplierBlockingRelation[] {
  const relations: SupplierBlockingRelation[] = [];
  if (counts.purchases > 0) relations.push({ key: "purchases", label: "compras", count: counts.purchases });
  if (counts.quotes > 0) relations.push({ key: "quotes", label: "cotizaciones", count: counts.quotes });
  if (counts.cases > 0) relations.push({ key: "cases", label: "gestiones", count: counts.cases });
  return relations;
}

export function assertSupplierDeletable(relations: SupplierBlockingRelation[]) {
  if (relations.length === 0) return;

  const detail = relations.map((relation) => `${relation.count} ${relation.label}`).join(", ");
  throw new DomainError(
    `No es posible eliminar el proveedor porque tiene registros asociados: ${detail}.`,
    409,
  );
}

export function prismaErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

export function publicSupplierError(error: unknown): { message: string; status: number } {
  if (error instanceof SyntaxError) {
    return { message: "Los datos del proveedor no son válidos.", status: 400 };
  }
  if (error instanceof DomainError) {
    return { message: error.message, status: error.status };
  }
  const code = prismaErrorCode(error);
  if (code === "P2025") {
    return { message: "Proveedor no encontrado.", status: 404 };
  }
  if (code === "P2003" || code === "P2014") {
    return { message: "No es posible eliminar el proveedor porque tiene registros asociados.", status: 409 };
  }
  return { message: "No fue posible completar la operación.", status: 500 };
}

export function serializeSupplier(supplier: SupplierRecord) {
  return {
    id: supplier.id,
    name: supplier.name,
    identifier: supplier.identifier,
    phone: supplier.phone,
    contactName: supplier.contactName,
    email: supplier.email,
    manufacturer: supplier.manufacturer,
    originCountry: supplier.originCountry,
    country: supplier.country,
    notes: supplier.notes,
    createdAt: supplier.createdAt.toISOString(),
    updatedAt: supplier.updatedAt.toISOString(),
  };
}
