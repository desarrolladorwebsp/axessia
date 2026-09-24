import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { getInternalActor } from "@/lib/internal-access";
import { prisma } from "@/lib/prisma";

const MAX_TEXT = 191;
const productTypes = new Set(["MEDICATION", "MEDICAL_DEVICE"]);
const conditions = new Set(["AVAILABLE", "SPECIAL_IMPORT"]);

function text(value: unknown, max = MAX_TEXT) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function nullable(value: unknown, max = MAX_TEXT) { const result = text(value, max); return result || null; }
function parsePayload(body: Record<string, unknown>) {
  const productType = text(body.productType);
  const productName = text(body.productName);
  const cost = typeof body.cost === "number" ? body.cost : Number(body.cost);
  if (!productTypes.has(productType) || !productName || !Number.isFinite(cost) || cost < 0) throw new Error("Tipo, nombre y costo son obligatorios.");
  const units = body.unitsPerPackage === "" || body.unitsPerPackage == null ? null : Number(body.unitsPerPackage);
  if (units !== null && (!Number.isInteger(units) || units <= 0)) throw new Error("Las unidades por presentación deben ser un entero positivo.");
  const condition = conditions.has(text(body.condition)) ? text(body.condition) : null;
  return { productType, productName, activeIngredient: nullable(body.activeIngredient), concentration: nullable(body.concentration), pharmaceuticalForm: nullable(body.pharmaceuticalForm), brand: nullable(body.brand), model: nullable(body.model), description: nullable(body.description, 2000), presentation: nullable(body.presentation), unitsPerPackage: units, manufacturer: nullable(body.manufacturer), originCountry: nullable(body.originCountry), supplierCountry: nullable(body.supplierCountry), supplierId: nullable(body.supplierId), sanitaryRegistry: nullable(body.sanitaryRegistry), condition, cost: cost.toFixed(2) };
}

export async function GET(request: NextRequest) {
  if (!await getInternalActor()) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const params = request.nextUrl.searchParams;
  const query = text(params.get("q"), 100);
  const type = text(params.get("productType"));
  const filters = [Prisma.sql`isActive = true`];
  if (type && productTypes.has(type)) filters.push(Prisma.sql`productType = ${type}`);
  if (query) { const like = `%${query}%`; filters.push(Prisma.sql`(productName LIKE ${like} OR activeIngredient LIKE ${like} OR brand LIKE ${like} OR model LIKE ${like})`); }
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT id, productType, productName, activeIngredient, concentration, pharmaceuticalForm, brand, model, description, presentation, unitsPerPackage, manufacturer, originCountry, supplierCountry, supplierId, sanitaryRegistry, \`condition\`, cost, isActive, createdAt, updatedAt FROM Product WHERE ${Prisma.join(filters, " AND ")} ORDER BY productName ASC LIMIT 200`);
  return NextResponse.json({ products: rows.map(serializeProduct) });
}

export async function POST(request: NextRequest) {
  if (!await getInternalActor()) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const payload = parsePayload(await request.json() as Record<string, unknown>);
    const id = crypto.randomUUID();
    await prisma.$executeRaw`INSERT INTO Product (id, productType, productName, activeIngredient, concentration, pharmaceuticalForm, brand, model, description, presentation, unitsPerPackage, manufacturer, originCountry, supplierCountry, supplierId, sanitaryRegistry, \`condition\`, cost, isActive, createdAt, updatedAt) VALUES (${id}, ${payload.productType}, ${payload.productName}, ${payload.activeIngredient}, ${payload.concentration}, ${payload.pharmaceuticalForm}, ${payload.brand}, ${payload.model}, ${payload.description}, ${payload.presentation}, ${payload.unitsPerPackage}, ${payload.manufacturer}, ${payload.originCountry}, ${payload.supplierCountry}, ${payload.supplierId}, ${payload.sanitaryRegistry}, ${payload.condition}, ${payload.cost}, true, NOW(3), NOW(3))`;
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible crear el producto." }, { status: 400 }); }
}

function serializeProduct(row: Record<string, unknown>) { return { ...row, cost: row.cost == null ? null : String(row.cost), createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt, updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt }; }
