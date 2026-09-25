import { expect, test } from "@playwright/test";

test.describe("Formulario de inicio de sesión", () => {
  test("muestra los campos de correo y contraseña y permite alternar entre cliente y colaborador", async ({ page }) => {
    await page.goto("/ingresar");

    await expect(page.getByLabel(/correo electrónico/i)).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();

    await page.getByRole("button", { name: /colaboradores/i }).click();
    await expect(page.getByRole("button", { name: /ingresar como usuario interno/i })).toBeVisible();
  });

  test("no navega fuera de /ingresar si se intenta enviar el formulario vacío", async ({ page }) => {
    await page.goto("/ingresar");

    await page.getByRole("button", { name: /^ingresar como cliente$/i }).click();

    await expect(page).toHaveURL(/\/ingresar/);
  });
});

test.describe("Validación de campos obligatorios en el registro de cliente", () => {
  test("bloquea el registro y muestra un mensaje cuando faltan campos obligatorios", async ({ page }) => {
    await page.goto("/registrarme");

    // Envía el formulario sin completar ningún campo.
    await page.getByRole("button", { name: /registrarme como cliente/i }).click();

    await expect(page.getByText(/completa todos los campos obligatorios/i)).toBeVisible();
    await expect(page).toHaveURL(/\/registrarme/);
  });

  test("bloquea el registro cuando el RUT no es válido", async ({ page }) => {
    await page.goto("/registrarme");

    await page.getByLabel(/^nombre$/i).fill("Ana");
    await page.getByLabel(/apellido/i).fill("Pérez");
    await page.getByLabel(/teléfono/i).fill("+56911112222");
    await page.getByLabel(/correo electrónico/i).fill("ana.qa@axessia-qa.test");
    await page.getByLabel(/^rut$/i).fill("11.111.111-2");
    await page.getByLabel(/ciudad/i).fill("Santiago");
    await page.getByLabel(/^contraseña$/i).fill("AxessiaQA1234");
    await page.getByLabel(/repite tu contraseña/i).fill("AxessiaQA1234");
    await page.getByLabel(/tratamiento de mis datos personales/i).check();

    await page.getByRole("button", { name: /registrarme como cliente/i }).click();

    await expect(page.getByText(/rut ingresado no es válido/i)).toBeVisible();
    await expect(page).toHaveURL(/\/registrarme/);
  });

  test("bloquea el registro cuando la contraseña no cumple la política", async ({ page }) => {
    await page.goto("/registrarme");

    await page.getByLabel(/^nombre$/i).fill("Ana");
    await page.getByLabel(/apellido/i).fill("Pérez");
    await page.getByLabel(/teléfono/i).fill("+56911112222");
    await page.getByLabel(/correo electrónico/i).fill("ana.qa@axessia-qa.test");
    await page.getByLabel(/^rut$/i).fill("12.345.678-5");
    await page.getByLabel(/ciudad/i).fill("Santiago");
    await page.getByLabel(/^contraseña$/i).fill("abc123");
    await page.getByLabel(/repite tu contraseña/i).fill("abc123");
    await page.getByLabel(/tratamiento de mis datos personales/i).check();

    await page.getByRole("button", { name: /registrarme como cliente/i }).click();

    await expect(page.locator(".register-message-error")).toHaveText(/mayúscula, una minúscula y un número/i);
    await expect(page).toHaveURL(/\/registrarme/);
  });
});
