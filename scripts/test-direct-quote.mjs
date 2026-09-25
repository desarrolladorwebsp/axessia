import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3003";
const customerEmail = process.env.TEST_CUSTOMER_EMAIL;

if (!customerEmail) {
  throw new Error("Define TEST_CUSTOMER_EMAIL para ejecutar la prueba.");
}

function rutVerifier(digits) {
  let sum = 0;
  let multiplier = 2;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    sum += Number(digits[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return "0";
  if (remainder === 10) return "K";
  return String(remainder);
}

function internalSessionToken(userId) {
  const payload = `${userId}:${Date.now()}`;
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "axessia-local-dev-secret";
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

async function json(response) {
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`HTTP ${response.status}: respuesta no JSON (${text.slice(0, 160) || "vacía"})`);
  }
  if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}: ${text || "respuesta vacía"}`);
  return body;
}

try {
  const [actor, supplier] = await Promise.all([
    prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } }),
    prisma.supplier.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!actor) throw new Error("No existe un usuario interno para la prueba.");
  if (!supplier) throw new Error("No existe un proveedor para la prueba.");

  const rutDigits = "17654321";
  const customerRut = `${rutDigits}-${rutVerifier(rutDigits)}`;
  const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const cookie = `axessia_internal_session=${internalSessionToken(actor.id)}`;

  const quote = await json(await fetch(`${baseUrl}/api/quotes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      directCustomer: {
        name: "Smartpro Agencia",
        email: customerEmail,
        rut: customerRut,
        phone: "+56 9 0000 0000",
        city: "Santiago",
      },
      validUntil,
      estimatedShippingDays: 10,
      asDraft: false,
      items: [{
        productType: "MEDICATION",
        productName: "Producto QA cotización directa",
        activeIngredient: "Prueba de integración AXESSIA",
        concentration: "1 unidad",
        pharmaceuticalForm: "Otro",
        presentation: "Unidad de prueba",
        supplierId: supplier.id,
        quantity: 1,
        condition: "AVAILABLE",
        unitPrice: 10000,
      }],
    }),
  }));

  let sendResult = { sent: false, error: null };
  try {
    const sent = await json(await fetch(`${baseUrl}/api/quotes/${quote.id}/send`, {
      method: "POST",
      headers: { Cookie: cookie },
    }));
    sendResult = { sent: sent.status === "SENT", error: null };
  } catch (error) {
    sendResult = { sent: false, error: error instanceof Error ? error.message : "Error desconocido" };
  }

  const tracking = await json(await fetch(`${baseUrl}/api/tracking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestNumber: quote.quoteNumber, rut: customerRut }),
  }));
  const detail = await json(await fetch(`${baseUrl}/api/tracking/detail?token=${encodeURIComponent(tracking.token)}`));

  const persisted = await prisma.quote.findUnique({
    where: { id: quote.id },
    select: { quoteNumber: true, status: true, request: { select: { origin: true } } },
  });

  console.log(JSON.stringify({
    quoteId: quote.id,
    quoteNumber: persisted?.quoteNumber,
    status: persisted?.status,
    origin: persisted?.request.origin,
    customerEmail,
    supplier: supplier.name,
    trackingVerified: detail.quote?.quoteNumber === persisted?.quoteNumber,
    emailSent: sendResult.sent,
    emailError: sendResult.error,
  }, null, 2));
} finally {
  await prisma.$disconnect();
}
