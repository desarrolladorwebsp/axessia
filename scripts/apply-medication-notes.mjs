import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SCHEMAS = ["axessia_dev", "axessia_db"];

async function columnExists(schema) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = '${schema}'
      AND TABLE_NAME = 'Medication'
      AND COLUMN_NAME = 'notes'
  `);
  return rows.length > 0;
}

async function main() {
  for (const schema of SCHEMAS) {
    if (await columnExists(schema)) {
      console.log(`${schema}.Medication.notes ya existe`);
      continue;
    }
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`${schema}\`.\`Medication\` ADD COLUMN \`notes\` TEXT NULL`,
    );
    console.log(`${schema}.Medication.notes agregado (NULL)`);
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
