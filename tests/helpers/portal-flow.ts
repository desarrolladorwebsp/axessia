import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { generateValidTestRut, testCustomerName, TEST_PASSWORD, uniqueTestEmail } from "./test-data";

export const FIXTURES_DIR = path.join(__dirname, "..", "fixtures", "files");

export type TestCustomer = { email: string; name: string; rut: string };

/** Registra un cliente nuevo y aislado en la UI pública y deja la sesión iniciada en /mi-cuenta. */
export async function registerAndLoginCustomer(page: Page, prefix: string, seed: number): Promise<TestCustomer> {
  const email = uniqueTestEmail(prefix);
  const name = testCustomerName(prefix);
  const rut = generateValidTestRut(seed);

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
  await page.getByRole("link", { name: /entrar a mi cuenta/i }).click();

  await page.getByLabel(/correo electrónico/i).fill(email);
  await page.locator("#login-password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /^ingresar como cliente$/i }).click();
  await expect(page).toHaveURL(/\/mi-cuenta/);

  return { email, name, rut };
}

/** Crea una solicitud de medicamento con receta en PDF desde el panel del cliente ya autenticado. */
export async function createMedicationRequestWithPdf(
  page: Page,
  medication: { name: string; activeIngredient: string; concentration: string } = {
    name: "Panadol QA",
    activeIngredient: "Paracetamol",
    concentration: "500mg",
  },
): Promise<string> {
  await page.goto("/mi-cuenta");
  await page.getByRole("button", { name: /crear mi primera solicitud|nueva solicitud/i }).first().click();

  await page.getByRole("button", { name: /^continuar$/i }).click();

  await page.locator("#quote-file").setInputFiles(path.join(FIXTURES_DIR, "sample-document.pdf"));
  await page.locator("#product-1-name").fill(medication.name);
  await page.locator("#product-1-activeIngredient").fill(medication.activeIngredient);
  await page.locator("#product-1-concentration").fill(medication.concentration);
  await page.getByRole("button", { name: /revisar solicitud/i }).click();

  await page.getByLabel(/políticas de la empresa/i).check();
  await page.getByLabel(/autorizo el tratamiento de mis datos personales/i).check();
  await page.getByRole("button", { name: /enviar solicitud/i }).click();

  await expect(page.getByRole("heading", { name: /recibimos tu solicitud/i })).toBeVisible();
  const requestNumberText = await page.getByText(/id de solicitud:/i).innerText();
  const requestNumber = requestNumberText.replace(/id de solicitud:\s*/i, "").trim();
  await page.getByRole("button", { name: /^cerrar$/i }).click();

  return requestNumber;
}

/** Obtiene el href (id interno) del detalle de una solicitud a partir de su número visible en el listado. */
export async function getRequestDetailUrl(page: Page, requestNumber: string): Promise<string> {
  await page.reload();
  const link = page.getByRole("link", { name: requestNumber }).first();
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  if (!href) throw new Error(`No fue posible obtener el enlace de detalle para ${requestNumber}`);
  return href;
}
