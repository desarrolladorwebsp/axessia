import { expect, test } from "@playwright/test";
import { ADMIN_CREDENTIALS_AVAILABLE, ADMIN_SKIP_REASON, ADMIN_TEST_EMAIL, ADMIN_TEST_PASSWORD } from "../../helpers/mutation-gate";

/**
 * Requiere una cuenta interna (ejecutivo/administrador) ya existente en el
 * entorno de pruebas, provista por variables de entorno. No se crea ninguna
 * cuenta interna automáticamente porque el alta requiere una invitación
 * emitida por otro usuario administrador.
 */
test.describe("Acceso administrativo interno", () => {
  test.skip(!ADMIN_CREDENTIALS_AVAILABLE, ADMIN_SKIP_REASON);

  test("un colaborador interno inicia sesión y accede al panel /app", async ({ page }) => {
    await page.goto("/ingresar");
    await page.getByRole("button", { name: /colaboradores/i }).click();
    await page.getByLabel(/correo electrónico/i).fill(ADMIN_TEST_EMAIL!);
    await page.locator("#login-password").fill(ADMIN_TEST_PASSWORD!);
    await page.getByRole("button", { name: /ingresar como usuario interno/i }).click();

    await expect(page).toHaveURL(/\/app\/dashboard/);
    await expect(page.getByRole("heading", { name: /dashboard/i }).first()).toBeVisible();
  });

  test("un colaborador interno puede ver el listado de solicitudes", async ({ page }) => {
    await page.goto("/ingresar");
    await page.getByRole("button", { name: /colaboradores/i }).click();
    await page.getByLabel(/correo electrónico/i).fill(ADMIN_TEST_EMAIL!);
    await page.locator("#login-password").fill(ADMIN_TEST_PASSWORD!);
    await page.getByRole("button", { name: /ingresar como usuario interno/i }).click();
    await expect(page).toHaveURL(/\/app/);

    await page.goto("/app/solicitudes");
    await expect(page).toHaveURL(/\/app\/solicitudes/);
  });

  test("un colaborador interno puede iniciar una cotización directa", async ({ page }) => {
    await page.goto("/ingresar");
    await page.getByRole("button", { name: /colaboradores/i }).click();
    await page.getByLabel(/correo electrónico/i).fill(ADMIN_TEST_EMAIL!);
    await page.locator("#login-password").fill(ADMIN_TEST_PASSWORD!);
    await page.getByRole("button", { name: /ingresar como usuario interno/i }).click();
    await expect(page).toHaveURL(/\/app/);

    await page.goto("/app/quotes");
    await page.getByRole("button", { name: /nueva cotización/i }).click();

    await expect(page.getByRole("dialog", { name: /nueva cotización directa/i })).toBeVisible();
    await expect(page.getByLabel(/nombre completo/i)).toBeVisible();
    await expect(page.getByLabel(/^rut/i)).toBeVisible();
    await expect(page.getByLabel(/correo electrónico/i)).toBeVisible();
  });
});
