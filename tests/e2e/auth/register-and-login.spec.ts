import { expect, test } from "@playwright/test";
import { MUTATIONS_ALLOWED, MUTATIONS_SKIP_REASON } from "../../helpers/mutation-gate";
import { generateValidTestRut, testCustomerName, TEST_PASSWORD, uniqueTestEmail } from "../../helpers/test-data";

test.describe("Registro de cliente e inicio de sesión", () => {
  test.skip(!MUTATIONS_ALLOWED, MUTATIONS_SKIP_REASON);

  test("un cliente nuevo puede registrarse y luego iniciar sesión en su panel", async ({ page }) => {
    const email = uniqueTestEmail("register");
    const name = testCustomerName("Register");
    const rut = generateValidTestRut(Date.now());

    await page.goto("/registrarme");
    await page.getByLabel(/^nombre$/i).fill(name);
    await page.getByLabel(/apellido/i).fill("Playwright");
    await page.getByLabel(/teléfono/i).fill("+56 9 1234 5678");
    await page.getByLabel(/correo electrónico/i).fill(email);
    await page.getByLabel(/^rut$/i).fill(rut);
    await page.getByLabel(/ciudad/i).fill("Santiago");
    await page.getByLabel(/^contraseña$/i).fill(TEST_PASSWORD);
    await page.getByLabel(/repite tu contraseña/i).fill(TEST_PASSWORD);
    await page.getByLabel(/tratamiento de mis datos personales/i).check();

    await page.getByRole("button", { name: /registrarme como cliente/i }).click();
    await page.getByRole("button", { name: /confirmar registro/i }).click();

    await expect(page.getByRole("heading", { name: /bienvenido a axessia/i })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();

    await page.getByRole("link", { name: /entrar a mi cuenta/i }).click();
    await expect(page).toHaveURL(/\/ingresar/);

    await page.getByLabel(/correo electrónico/i).fill(email);
    await page.locator("#login-password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /^ingresar como cliente$/i }).click();

    await expect(page).toHaveURL(/\/mi-cuenta/);
    await expect(page.getByRole("heading", { name: new RegExp(`Hola, ${name}`, "i") })).toBeVisible();
  });

  test("rechaza el inicio de sesión con contraseña incorrecta", async ({ page }) => {
    const email = uniqueTestEmail("wrongpass");
    const name = testCustomerName("WrongPass");
    const rut = generateValidTestRut(Date.now() + 1);

    await page.goto("/registrarme");
    await page.getByLabel(/^nombre$/i).fill(name);
    await page.getByLabel(/apellido/i).fill("Playwright");
    await page.getByLabel(/teléfono/i).fill("+56 9 1234 5678");
    await page.getByLabel(/correo electrónico/i).fill(email);
    await page.getByLabel(/^rut$/i).fill(rut);
    await page.getByLabel(/ciudad/i).fill("Santiago");
    await page.getByLabel(/^contraseña$/i).fill(TEST_PASSWORD);
    await page.getByLabel(/repite tu contraseña/i).fill(TEST_PASSWORD);
    await page.getByLabel(/tratamiento de mis datos personales/i).check();
    await page.getByRole("button", { name: /registrarme como cliente/i }).click();
    await page.getByRole("button", { name: /confirmar registro/i }).click();
    await expect(page.getByRole("heading", { name: /bienvenido a axessia/i })).toBeVisible();

    await page.goto("/ingresar");
    await page.getByLabel(/correo electrónico/i).fill(email);
    await page.locator("#login-password").fill("ContraseñaIncorrecta1");
    await page.getByRole("button", { name: /^ingresar como cliente$/i }).click();

    await expect(page.getByText(/credenciales inválidas/i)).toBeVisible();
    await expect(page).toHaveURL(/\/ingresar/);
  });
});
