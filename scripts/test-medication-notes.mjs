import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const MIN_PDF = Buffer.from("%PDF-1.4 test prescription\n%%EOF\n");

async function columnState(schema) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = '${schema}'
      AND TABLE_NAME = 'Medication'
      AND COLUMN_NAME = 'notes'
  `);
  return rows[0] ?? null;
}

async function insertNotesOnProduction() {
  const testRequestId = `test-notes-${Date.now()}`;
  const withNotesId = `test-med-notes-${Date.now()}`;
  const withoutNotesId = `test-med-empty-${Date.now()}`;
  await prisma.$executeRawUnsafe(`
    INSERT INTO axessia_db.QuoteRequest
      (id, requesterName, requesterPhone, requesterEmail, requesterRut, requesterCity, status, origin, productType, acceptsPolicies, acceptsDataTreatment, createdAt, updatedAt)
    VALUES
      ('${testRequestId}', 'Test medication notes', '0', 'test.notes@example.com', '1-9', 'Santiago', 'RECEIVED', 'WEB', 'MEDICATION', 1, 1, NOW(3), NOW(3))
  `);
  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO axessia_db.Medication (id, requestId, commercialName, activeIngredient, concentration, tabletQuantity, notes, createdAt)
      VALUES
        ('${withNotesId}', '${testRequestId}', 'Test con notas', 'Test', '1mg', NULL, 'Tomar con alimentos', NOW(3)),
        ('${withoutNotesId}', '${testRequestId}', 'Test sin notas', 'Test', '1mg', NULL, NULL, NOW(3))
    `);
    const inserted = await prisma.$queryRawUnsafe(`
      SELECT id, notes FROM axessia_db.Medication WHERE id IN ('${withNotesId}', '${withoutNotesId}')
    `);
    const withNotes = inserted.find((row) => row.id === withNotesId);
    const withoutNotes = inserted.find((row) => row.id === withoutNotesId);
    if (withNotes?.notes !== "Tomar con alimentos") {
      throw new Error("El INSERT en producción no conservó las observaciones.");
    }
    if (withoutNotes?.notes !== null) {
      throw new Error("El INSERT en producción no aceptó observaciones NULL.");
    }
  } finally {
    await prisma.$executeRawUnsafe(`DELETE FROM axessia_db.Medication WHERE requestId = '${testRequestId}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM axessia_db.QuoteRequest WHERE id = '${testRequestId}'`);
  }
}

function buildPayload(notes) {
  const stamp = Date.now();
  return {
    customer: {
      name: `Test Observaciones ${stamp}`,
      phone: "+56900001111",
      email: `test.notes.${stamp}@example.com`,
      rut: "12345678-5",
      city: "Santiago",
    },
    productType: "MEDICATION",
    medications: [{
      commercialName: "Paracetamol",
      activeIngredient: "Paracetamol",
      concentration: "500mg",
      tabletQuantity: null,
      notes,
    }],
    acceptsPolicies: true,
    acceptsDataTreatment: true,
  };
}

async function createViaApi(notes) {
  const formData = new FormData();
  formData.append("payload", JSON.stringify(buildPayload(notes)));
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
    const column = await columnState(schema);
    const ok = column?.IS_NULLABLE === "YES";
    checks.push(`${schema} notes=${column ? `${column.COLUMN_TYPE} nullable=${column.IS_NULLABLE}` : "MISSING"}`);
    if (!ok) throw new Error(`${schema}.Medication.notes no existe o no es NULL`);
  }
  console.log(checks.join(" | "));

  await insertNotesOnProduction();
  console.log("PASS  producción acepta INSERT con y sin observaciones");

  const withNotes = await createViaApi("Presentación importada, sin genérico local");
  const withoutNotes = await createViaApi(null);
  const created = await prisma.medication.findMany({
    where: { requestId: { in: [withNotes.id, withoutNotes.id] } },
    select: { requestId: true, notes: true },
  });
  const filled = created.find((item) => item.requestId === withNotes.id);
  const empty = created.find((item) => item.requestId === withoutNotes.id);
  if (filled?.notes !== "Presentación importada, sin genérico local") {
    throw new Error("La solicitud con observaciones no las guardó");
  }
  if (empty?.notes !== null) {
    throw new Error("La solicitud sin observaciones no guardó null");
  }
  console.log(`PASS  API con observaciones (${withNotes.requestNumber})`);
  console.log(`PASS  API sin observaciones (${withoutNotes.requestNumber})`);

  await prisma.quoteRequest.deleteMany({ where: { id: { in: [withNotes.id, withoutNotes.id] } } });
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
