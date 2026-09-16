import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const MIN_PDF = Buffer.from("%PDF-1.4 test prescription\n%%EOF\n");

async function columnNullable(schema) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = '${schema}'
      AND TABLE_NAME = 'Medication'
      AND COLUMN_NAME = 'tabletQuantity'
  `);
  return rows[0]?.IS_NULLABLE === "YES";
}

async function insertAndDeleteNullOnProduction() {
  const testRequestId = `test-qty-${Date.now()}`;
  const testMedicationId = `test-med-${Date.now()}`;
  await prisma.$executeRawUnsafe(`
    INSERT INTO axessia_db.QuoteRequest
      (id, requesterName, requesterPhone, requesterEmail, requesterRut, requesterCity, status, origin, productType, acceptsPolicies, acceptsDataTreatment, createdAt, updatedAt)
    VALUES
      ('${testRequestId}', 'Test tabletQuantity', '0', 'test.tablet@example.com', '1-9', 'Santiago', 'RECEIVED', 'WEB', 'MEDICATION', 1, 1, NOW(3), NOW(3))
  `);
  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO axessia_db.Medication (id, requestId, commercialName, activeIngredient, concentration, tabletQuantity, createdAt)
      VALUES ('${testMedicationId}', '${testRequestId}', 'Test opcional', 'Test', '1mg', NULL, NOW(3))
    `);
    const inserted = await prisma.$queryRawUnsafe(`
      SELECT tabletQuantity FROM axessia_db.Medication WHERE id = '${testMedicationId}'
    `);
    if (inserted[0]?.tabletQuantity !== null) {
      throw new Error("El INSERT en producción no conservó null.");
    }
  } finally {
    await prisma.$executeRawUnsafe(`DELETE FROM axessia_db.Medication WHERE id = '${testMedicationId}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM axessia_db.QuoteRequest WHERE id = '${testRequestId}'`);
  }
}

function buildPayload(tabletQuantity) {
  const stamp = Date.now();
  return {
    customer: {
      name: `Test Cantidad ${stamp}`,
      phone: "+56900001111",
      email: `test.tablet.${stamp}@example.com`,
      rut: "12345678-5",
      city: "Santiago",
    },
    productType: "MEDICATION",
    medications: [{
      commercialName: "Paracetamol",
      activeIngredient: "Paracetamol",
      concentration: "500mg",
      tabletQuantity,
    }],
    acceptsPolicies: true,
    acceptsDataTreatment: true,
  };
}

async function createViaApi(tabletQuantity) {
  const formData = new FormData();
  formData.append("payload", JSON.stringify(buildPayload(tabletQuantity)));
  formData.append("prescription", new File([MIN_PDF], "receta-test.pdf", { type: "application/pdf" }));
  const response = await fetch(`${BASE_URL}/api/quote-requests`, { method: "POST", body: formData });
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Respuesta no JSON (${response.status}): ${text.slice(0, 180)}`);
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${body.error || text.slice(0, 180)}`);
  }
  return body;
}

async function main() {
  const checks = [];
  for (const schema of ["axessia_dev", "axessia_db"]) {
    const ok = await columnNullable(schema);
    checks.push(`${schema} nullable=${ok ? "YES" : "NO"}`);
    if (!ok) throw new Error(`${schema}.Medication.tabletQuantity sigue siendo NOT NULL`);
  }
  console.log(checks.join(" | "));

  await insertAndDeleteNullOnProduction();
  console.log("PASS  producción acepta INSERT con tabletQuantity NULL");

  const withoutQuantity = await createViaApi(null);
  const withQuantity = await createViaApi(30);
  const created = await prisma.medication.findMany({
    where: { requestId: { in: [withoutQuantity.id, withQuantity.id] } },
    select: { requestId: true, tabletQuantity: true },
  });
  const empty = created.find((item) => item.requestId === withoutQuantity.id);
  const filled = created.find((item) => item.requestId === withQuantity.id);
  if (empty?.tabletQuantity !== null) throw new Error("La solicitud sin cantidad no guardó null");
  if (filled?.tabletQuantity !== 30) throw new Error("La solicitud con cantidad no guardó 30");
  console.log(`PASS  API sin cantidad (${withoutQuantity.requestNumber})`);
  console.log(`PASS  API con cantidad (${withQuantity.requestNumber})`);

  await prisma.quoteRequest.deleteMany({ where: { id: { in: [withoutQuantity.id, withQuantity.id] } } });
  console.log("Limpieza de solicitudes de prueba lista.");
}

main()
  .catch((error) => {
    console.error("FAIL", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
