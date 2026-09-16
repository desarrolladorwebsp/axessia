import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PRODUCTION_SCHEMA = "axessia_db";

async function columnState(schema, table, column) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT IS_NULLABLE, COLUMN_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = '${schema}'
      AND TABLE_NAME = '${table}'
      AND COLUMN_NAME = '${column}'
  `);
  return rows[0] ?? null;
}

async function main() {
  const before = await columnState(PRODUCTION_SCHEMA, "Medication", "tabletQuantity");
  if (!before) {
    throw new Error(`No existe ${PRODUCTION_SCHEMA}.Medication.tabletQuantity`);
  }

  console.log(`Antes: tabletQuantity ${before.COLUMN_TYPE} nullable=${before.IS_NULLABLE}`);

  if (before.IS_NULLABLE !== "YES") {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`${PRODUCTION_SCHEMA}\`.\`Medication\` MODIFY \`tabletQuantity\` INTEGER NULL`,
    );
  }

  const after = await columnState(PRODUCTION_SCHEMA, "Medication", "tabletQuantity");
  console.log(`Después: tabletQuantity ${after.COLUMN_TYPE} nullable=${after.IS_NULLABLE}`);
  if (after?.IS_NULLABLE !== "YES") {
    throw new Error("La columna sigue siendo NOT NULL.");
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
