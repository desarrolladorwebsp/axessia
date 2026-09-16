import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function databaseHost() {
  const url = process.env.DATABASE_URL ?? "";
  const afterAt = url.split("@")[1] ?? "";
  return afterAt.split("/")[0] || "(sin host)";
}

async function main() {
  const currentSchema = await prisma.$queryRawUnsafe(`SELECT DATABASE() AS name`);
  const columns = await prisma.$queryRawUnsafe(`
    SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA IN ('axessia_dev', 'axessia_db')
      AND (
        (TABLE_NAME = 'Medication' AND COLUMN_NAME = 'tabletQuantity')
        OR (TABLE_NAME = 'ClientDocument' AND COLUMN_NAME IN ('documentKind', 'customLabel'))
      )
    ORDER BY TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME
  `);

  let migrations = [];
  try {
    migrations = await prisma.$queryRawUnsafe(`
      SELECT migration_name, finished_at, rolled_back_at
      FROM _prisma_migrations
      ORDER BY started_at
    `);
  } catch (error) {
    migrations = [{ error: error instanceof Error ? error.message.slice(0, 160) : "no _prisma_migrations" }];
  }

  let productionMigrations = [];
  try {
    productionMigrations = await prisma.$queryRawUnsafe(`
      SELECT migration_name, finished_at, rolled_back_at
      FROM axessia_db._prisma_migrations
      ORDER BY started_at
    `);
  } catch (error) {
    productionMigrations = [{ error: error instanceof Error ? error.message.slice(0, 160) : "no axessia_db._prisma_migrations" }];
  }

  const tables = await prisma.$queryRawUnsafe(`
    SELECT TABLE_SCHEMA, TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA IN ('axessia_dev', 'axessia_db')
      AND TABLE_NAME IN ('InternalPasswordResetToken', 'Medication', 'ClientDocument', '_prisma_migrations')
    ORDER BY TABLE_SCHEMA, TABLE_NAME
  `);

  console.log(JSON.stringify({ host: databaseHost(), currentSchema, columns, migrations, productionMigrations, tables }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
