import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "path";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const prisma = new PrismaClient();

const MIN_PDF = Buffer.from("%PDF-1.4 test prescription\n%%EOF\n");
const REPLACEMENT_PDF = Buffer.from("%PDF-1.4 replacement file\n%%EOF\n");
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

function buildPayload() {
  const stamp = Date.now();
  return {
    customer: {
      name: `Test Files ${stamp}`,
      phone: "+56900002222",
      email: `test.files.${stamp}@example.com`,
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

async function createPrescriptionRequest() {
  const payload = buildPayload();
  const file = new File([MIN_PDF], "receta-crud.pdf", { type: "application/pdf" });
  const response = await fetch(`${BASE_URL}/api/quote-requests`, {
    method: "POST",
    body: buildFormData(payload, file),
  });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(`${response.status} ${JSON.stringify(body)}`);
  }

  const prescription = await prisma.prescription.findFirst({
    where: { requestId: body.id },
    select: { id: true, storageKey: true, fileName: true, mimeType: true },
  });

  if (!prescription?.storageKey) {
    throw new Error("Prescription without storageKey");
  }

  return { requestId: body.id, prescription };
}

function getStorageRoot() {
  const configured = process.env.AXESSIA_STORAGE_ROOT?.trim();
  if (configured) return path.resolve(configured);
  return path.join(process.cwd(), "storage", "axessia");
}

async function testUnauthorizedGet(prescriptionId) {
  const response = await fetch(`${BASE_URL}/api/files/prescriptions/${prescriptionId}`);
  if (response.status === 401) {
    pass("Seguridad · GET sin sesión rechazado");
    return;
  }
  fail("Seguridad · GET sin sesión rechazado", `status ${response.status}`);
}

async function testInvalidCategory(cookie) {
  const response = await fetch(`${BASE_URL}/api/files/invalid-category/doc-1`, {
    headers: { Cookie: cookie },
  });
  if (response.status === 400) {
    pass("Validación · categoría inválida rechazada");
    return;
  }
  fail("Validación · categoría inválida rechazada", `status ${response.status}`);
}

async function testGetFile(cookie, prescription) {
  const response = await fetch(`${BASE_URL}/api/files/prescriptions/${prescription.id}`, {
    headers: { Cookie: cookie },
  });

  if (!response.ok) {
    fail("GET · leer archivo almacenado", `${response.status} ${await response.text()}`);
    return null;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type");
  const disposition = response.headers.get("content-disposition");

  if (buffer.length <= 0) {
    fail("GET · leer archivo almacenado", "Respuesta vacía");
    return null;
  }
  if (contentType !== prescription.mimeType) {
    fail("GET · leer archivo almacenado", `Content-Type inesperado: ${contentType}`);
    return null;
  }
  if (!disposition?.includes("inline")) {
    fail("GET · leer archivo almacenado", "Falta Content-Disposition inline");
    return null;
  }

  pass("GET · leer archivo almacenado");
  return buffer;
}

async function testReplaceFile(cookie, prescription) {
  const formData = new FormData();
  formData.append("file", new File([REPLACEMENT_PDF], "receta-reemplazo.pdf", { type: "application/pdf" }));

  const response = await fetch(`${BASE_URL}/api/files/prescriptions/${prescription.id}`, {
    method: "PUT",
    headers: { Cookie: cookie },
    body: formData,
  });
  const body = await response.json();

  if (!response.ok) {
    fail("PUT · reemplazar archivo", `${response.status} ${JSON.stringify(body)}`);
    return null;
  }

  const updated = await prisma.prescription.findUnique({
    where: { id: prescription.id },
    select: { storageKey: true, fileName: true, fileSize: true },
  });

  if (!updated?.storageKey || updated.storageKey === prescription.storageKey) {
    fail("PUT · reemplazar archivo", "storageKey no actualizado");
    return null;
  }

  const absolutePath = path.join(getStorageRoot(), updated.storageKey);
  const stat = await fs.stat(absolutePath);
  if (!stat.isFile() || stat.size !== REPLACEMENT_PDF.length) {
    fail("PUT · reemplazar archivo", "Archivo en disco no coincide");
    return null;
  }

  try {
    await fs.access(path.join(getStorageRoot(), prescription.storageKey));
    fail("PUT · reemplazar archivo", "Archivo anterior sigue en disco");
    return null;
  } catch {
    // expected
  }

  pass("PUT · reemplazar archivo");
  return updated.storageKey;
}

async function testReplaceInvalidFile(cookie, prescriptionId) {
  const formData = new FormData();
  formData.append("file", new File([Buffer.from("not-valid")], "malicioso.exe", { type: "application/octet-stream" }));

  const response = await fetch(`${BASE_URL}/api/files/prescriptions/${prescriptionId}`, {
    method: "PUT",
    headers: { Cookie: cookie },
    body: formData,
  });

  if (response.status === 400) {
    pass("Validación · PUT con archivo inválido rechazado");
    return;
  }
  fail("Validación · PUT con archivo inválido rechazado", `status ${response.status}`);
}

async function testDeleteFile(cookie, prescriptionId, storageKey) {
  const response = await fetch(`${BASE_URL}/api/files/prescriptions/${prescriptionId}`, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });

  if (response.status !== 204) {
    fail("DELETE · eliminar documento", `status ${response.status}`);
    return;
  }

  const remaining = await prisma.prescription.findUnique({ where: { id: prescriptionId } });
  if (remaining) {
    fail("DELETE · eliminar documento", "Registro aún existe en base de datos");
    return;
  }

  try {
    await fs.access(path.join(getStorageRoot(), storageKey));
    fail("DELETE · eliminar documento", "Archivo sigue en disco");
    return;
  } catch {
    // expected
  }

  pass("DELETE · eliminar documento");
}

async function testGetAfterDelete(cookie, prescriptionId) {
  const response = await fetch(`${BASE_URL}/api/files/prescriptions/${prescriptionId}`, {
    headers: { Cookie: cookie },
  });

  if (response.status === 404) {
    pass("GET · documento eliminado devuelve 404");
    return;
  }
  fail("GET · documento eliminado devuelve 404", `status ${response.status}`);
}

async function main() {
  console.log(`Testing file operations against ${BASE_URL}\n`);

  try {
    await fetch(BASE_URL);
  } catch {
    fail("Servidor dev disponible", `No responde en ${BASE_URL}`);
    process.exitCode = 1;
    return;
  }
  pass("Servidor dev disponible");

  let cookie;
  let prescription;

  try {
    cookie = await loginExecutive();
    pass("Login ejecutivo");
  } catch (error) {
    fail("Login ejecutivo", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  try {
    const created = await createPrescriptionRequest();
    prescription = created.prescription;
    pass(`Fixture · solicitud con receta (${created.requestId})`);
  } catch (error) {
    fail("Fixture · solicitud con receta", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  await testUnauthorizedGet(prescription.id);
  await testInvalidCategory(cookie);
  await testGetFile(cookie, prescription);
  await testReplaceInvalidFile(cookie, prescription.id);
  const nextStorageKey = await testReplaceFile(cookie, prescription);
  if (nextStorageKey) {
    await testDeleteFile(cookie, prescription.id, nextStorageKey);
    await testGetAfterDelete(cookie, prescription.id);
  }

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
