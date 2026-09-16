import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Ruta pública de diagnóstico: verifica conectividad con la base de datos. */
export const dynamic = "force-dynamic";

const DB_TEST_TIMEOUT_MS = 5_000;

function getSafeDatabaseErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Error de conexión desconocido.";
  }

  const message = error.message.toLowerCase();

  if (message.includes("timed out") || message.includes("timeout")) {
    return "Tiempo de espera agotado al conectar con la base de datos.";
  }

  if (message.includes("authentication") || message.includes("access denied")) {
    return "No fue posible autenticarse con la base de datos.";
  }

  if (
    message.includes("connect") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("can't reach")
  ) {
    return "No fue posible conectar con el servidor de base de datos.";
  }

  return "No fue posible establecer conexión con la base de datos.";
}

async function runDatabasePing(): Promise<void> {
  await Promise.race([
    prisma.$queryRaw<Array<{ ping: number }>>`SELECT 1 AS ping`,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Connection timed out")), DB_TEST_TIMEOUT_MS);
    }),
  ]);
}

export async function GET() {
  try {
    await runDatabasePing();

    return NextResponse.json(
      { ok: true, database: "connected" },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Diagnostic-Route": "db-connection-test",
        },
      },
    );
  } catch (error) {
    console.error("[diagnostic] /api/db/test failed:", error);

    return NextResponse.json(
      {
        ok: false,
        database: "disconnected",
        error: getSafeDatabaseErrorMessage(error),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "X-Diagnostic-Route": "db-connection-test",
        },
      },
    );
  }
}
