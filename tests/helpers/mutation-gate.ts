/**
 * Algunos escenarios de este proyecto (registro, creación de solicitudes,
 * subida real de documentos, aislamiento entre clientes) requieren escribir
 * datos nuevos en la base de datos configurada en DATABASE_URL.
 *
 * Por seguridad, esas pruebas NO se ejecutan por defecto: podrían apuntar a
 * una base de datos compartida o de desarrollo real. Se habilitan solo con
 * una bandera explícita, apuntando idealmente a una base de datos de
 * pruebas aislada.
 *
 *   $env:E2E_ALLOW_MUTATIONS = "true"; npm run test:e2e
 */
export const MUTATIONS_ALLOWED = process.env.E2E_ALLOW_MUTATIONS === "true";

export const MUTATIONS_SKIP_REASON =
  "Requiere E2E_ALLOW_MUTATIONS=true y una base de datos de pruebas aislada (no se ejecuta contra datos reales por defecto).";

/** Credenciales de una cuenta interna (ejecutivo/administrador) ya existente en el entorno de pruebas. */
export const ADMIN_TEST_EMAIL = process.env.E2E_ADMIN_EMAIL;
export const ADMIN_TEST_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
export const ADMIN_CREDENTIALS_AVAILABLE = Boolean(ADMIN_TEST_EMAIL && ADMIN_TEST_PASSWORD);
export const ADMIN_SKIP_REASON =
  "Requiere E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD de una cuenta interna de prueba ya existente en el entorno.";
