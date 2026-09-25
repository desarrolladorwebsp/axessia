import { expect, test } from "@playwright/test";

test.describe("Protección de rutas privadas", () => {
  test("acceder a /mi-cuenta sin sesión redirige a /ingresar", async ({ page }) => {
    await page.goto("/mi-cuenta");
    await expect(page).toHaveURL(/\/ingresar/);
  });

  test("acceder a /mi-cuenta/solicitudes sin sesión redirige a /ingresar", async ({ page }) => {
    await page.goto("/mi-cuenta/solicitudes");
    await expect(page).toHaveURL(/\/ingresar/);
  });

  test("acceder al panel interno /app sin sesión redirige a /ingresar", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/ingresar/);
  });

  test("acceder a /app/usuarios sin sesión redirige a /ingresar", async ({ page }) => {
    await page.goto("/app/usuarios");
    await expect(page).toHaveURL(/\/ingresar/);
  });
});
