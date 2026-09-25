import { expect, test } from "@playwright/test";

test.describe("Carga inicial de la aplicación", () => {
  test("la página principal carga con el título, el hero y la navegación", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/AXESSIA/i);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/medicamentos/i);
    await expect(page.getByRole("link", { name: /ingresar/i }).first()).toBeVisible();
  });

  test("el botón principal abre el modal de cotización", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /cotiza desde tu receta/i }).click();

    await expect(page.getByRole("dialog", { name: /cuéntanos qué necesitas/i })).toBeVisible();
  });
});
