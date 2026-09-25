import { test } from "@playwright/test";

/**
 * Flujo básico de cotización (crear cotización desde el panel interno,
 * enviarla y que el cliente la acepte/rechace) todavía no se automatiza a
 * nivel E2E.
 *
 * Motivo: requiere una cuenta interna (ejecutivo/administrador) con permisos
 * para crear y enviar cotizaciones, más una solicitud ya "RECEIVED" para
 * cotizar. Encadenar todo esto de forma aislada (sin tocar datos reales)
 * necesita datos semilla dedicados para el entorno de pruebas.
 *
 * La lógica de negocio central de este flujo (qué transición de estado es
 * válida, cuándo se puede aceptar/rechazar, expiración, visibilidad para el
 * cliente) ya está cubierta con pruebas unitarias deterministas en
 * tests/portal/quote-decision.test.ts, por lo que el riesgo no cubierto es
 * principalmente de integración de UI, no de reglas de negocio.
 *
 * Recomendación para la siguiente auditoría: crear un script de seed para un
 * entorno de pruebas dedicado (cuenta ejecutivo + solicitud + cliente) y
 * habilitar este spec detrás de E2E_ALLOW_MUTATIONS + E2E_ADMIN_EMAIL.
 */
test.describe("Flujo básico de cotización (pendiente de automatizar)", () => {
  test.skip(true, "Pendiente: requiere datos semilla de cotización en un entorno de pruebas dedicado. Ver comentario del archivo.");
  test("crear, enviar y aceptar una cotización de extremo a extremo", async () => {
    // Intencionalmente vacío: placeholder documentado, no se reporta como éxito falso.
  });
});
