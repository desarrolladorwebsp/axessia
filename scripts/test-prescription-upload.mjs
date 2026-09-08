import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "path";

// AXESSIA suele correr en 3001 si otro Next.js ocupa 3000. Override con TEST_BASE_URL.
const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const prisma = new PrismaClient();

const MIN_PDF = Buffer.from("%PDF-1.4 test prescription\n%%EOF\n");
const MIN_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

const results = [];

function pass(name) {
  results.push({ name, ok: true });
  console.log(`PASS  ${name}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.error(`FAIL  ${name}: ${detail}`);
}

function buildPayload(overrides = {}) {
  const stamp = Date.now();
  return {
    customer: {
      name: `Test Cliente ${stamp}`,
      phone: "+56900001111",
      email: `test.upload.${stamp}@example.com`,
      rut: "12345678-5",
      city: "Santiago",
    },
    productType: "MEDICATION",
    medications: [{
      commercialName: "Paracetamol",
      activeIngredient: "Paracetamol",
      concentration: "500mg",
      tabletQuantity: 30,
    }],
    acceptsPolicies: true,
    acceptsDataTreatment: true,
    ...overrides,
  };
}

function buildFormData(payload, file) {
  const formData = new FormData();
  formData.append("payload", JSON.stringify(payload));
  if (file) {
    formData.append("prescription", file);
  }
  return formData;
}

async function loginExecutive() {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "soyalfredo.dev@gmail.com",
      password: "414233Lufe*",
      accountType: "executive",
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const cookie = response.headers.get("set-cookie");
  const match = cookie?.match(/axessia_internal_session=([^;]+)/);
  if (!match) throw new Error("Missing internal session cookie");
  return `axessia_internal_session=${match[1]}`;
}

async function verifyStoredPrescription(requestId) {
  const prescription = await prisma.prescription.findFirst({
    where: { requestId },
    select: { id: true, fileName: true, mimeType: true, fileSize: true, storageKey: true },
  });

  if (!prescription?.storageKey) {
    throw new Error("Prescription record missing storageKey");
  }

  const storageRoot = process.env.AXESSIA_STORAGE_ROOT?.trim()
    ? path.resolve(process.env.AXESSIA_STORAGE_ROOT.trim())
    : path.join(process.cwd(), "storage", "axessia");
  const absolutePath = path.join(storageRoot, prescription.storageKey);
  const stat = await fs.stat(absolutePath);

  if (!stat.isFile() || stat.size <= 0) {
    throw new Error("Stored file missing or empty");
  }

  return { prescription, absolutePath, size: stat.size };
}

async function testPublicPdfUpload() {
  const payload = buildPayload();
  const file = new File([MIN_PDF], "receta-test.pdf", { type: "application/pdf" });
  const response = await fetch(`${BASE_URL}/api/quote-requests`, {
    method: "POST",
    body: buildFormData(payload, file),
  });
  const body = await response.json();

  if (!response.ok) {
    fail("Web pública · PDF válido", `${response.status} ${JSON.stringify(body)}`);
    return null;
  }

  try {
    const stored = await verifyStoredPrescription(body.id);
    if (stored.prescription.mimeType !== "application/pdf") throw new Error("Unexpected mime type");
    pass(`Web pública · PDF válido (${body.requestNumber})`);
    return body.id;
  } catch (error) {
    fail("Web pública · PDF válido", error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function testPublicPngUpload() {
  const payload = buildPayload();
  const file = new File([MIN_PNG], "receta-test.png", { type: "image/png" });
  const response = await fetch(`${BASE_URL}/api/quote-requests`, {
    method: "POST",
    body: buildFormData(payload, file),
  });
  const body = await response.json();

  if (!response.ok) {
    fail("Web pública · PNG válido", `${response.status} ${JSON.stringify(body)}`);
    return;
  }

  try {
    await verifyStoredPrescription(body.id);
    pass(`Web pública · PNG válido (${body.requestNumber})`);
  } catch (error) {
    fail("Web pública · PNG válido", error instanceof Error ? error.message : String(error));
  }
}

async function testMissingPrescriptionRejected() {
  const payload = buildPayload();
  const response = await fetch(`${BASE_URL}/api/quote-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json();

  if (response.status === 400 && typeof body.error === "string" && body.error.toLowerCase().includes("receta")) {
    pass("Validación · medicamento sin receta rechazado");
    return;
  }

  fail("Validación · medicamento sin receta rechazado", `${response.status} ${JSON.stringify(body)}`);
}

async function testInvalidFileRejected() {
  const payload = buildPayload();
  const file = new File([Buffer.from("not-a-real-file")], "malicioso.exe", { type: "application/octet-stream" });
  const response = await fetch(`${BASE_URL}/api/quote-requests`, {
    method: "POST",
    body: buildFormData(payload, file),
  });
  const body = await response.json();

  if (response.status === 400) {
    pass("Validación · archivo inválido rechazado");
    return;
  }

  fail("Validación · archivo inválido rechazado", `${response.status} ${JSON.stringify(body)}`);
}

async function testExecutiveUpload() {
  const cookie = await loginExecutive();
  const payload = buildPayload({ origin: "EJECUTIVO" });
  const file = new File([MIN_PDF], "receta-ejecutivo.pdf", { type: "application/pdf" });
  const response = await fetch(`${BASE_URL}/api/quote-requests`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: buildFormData(payload, file),
  });
  const body = await response.json();

  if (!response.ok) {
    fail("Panel admin · PDF válido", `${response.status} ${JSON.stringify(body)}`);
    return;
  }

  try {
    const request = await prisma.quoteRequest.findUnique({
      where: { id: body.id },
      select: { origin: true },
    });
    if (request?.origin !== "EJECUTIVO") throw new Error(`Unexpected origin: ${request?.origin}`);
    await verifyStoredPrescription(body.id);
    pass(`Panel admin · PDF válido (${body.requestNumber})`);
  } catch (error) {
    fail("Panel admin · PDF válido", error instanceof Error ? error.message : String(error));
  }
}

async function testMedicalDeviceOptionalDocument() {
  const payload = buildPayload({
    productType: "MEDICAL_DEVICE",
    medications: [],
    medicalDevices: [{ name: "Tensiómetro", brand: "Omron", model: "M3", quantity: 1, description: null }],
  });
  const response = await fetch(`${BASE_URL}/api/quote-requests`, {
    method: "POST",
    body: buildFormData(payload, null),
  });
  const body = await response.json();

  if (!response.ok) {
    fail("Dispositivo médico · sin documento opcional", `${response.status} ${JSON.stringify(body)}`);
    return;
  }

  const prescriptionCount = await prisma.prescription.count({ where: { requestId: body.id } });
  if (prescriptionCount !== 0) {
    fail("Dispositivo médico · sin documento opcional", "Se creó prescription inesperadamente");
    return;
  }

  pass(`Dispositivo médico · sin documento opcional (${body.requestNumber})`);
}

async function main() {
  console.log(`Testing against ${BASE_URL}\n`);

  try {
    await fetch(BASE_URL);
  } catch {
    fail("Servidor dev disponible", `No responde en ${BASE_URL}`);
    process.exitCode = 1;
    return;
  }
  pass("Servidor dev disponible");

  await testMissingPrescriptionRejected();
  await testInvalidFileRejected();
  await testPublicPdfUpload();
  await testPublicPngUpload();
  await testMedicalDeviceOptionalDocument();
  await testExecutiveUpload();

  const failed = results.filter((item) => !item.ok);
  console.log(`\n${results.length - failed.length}/${results.length} tests passed`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
