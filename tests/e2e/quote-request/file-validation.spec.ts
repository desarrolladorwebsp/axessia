import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const FIXTURES_DIR = path.join(__dirname, "..", "..", "fixtures", "files");

async function openQuoteModalToStep2(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /cotiza desde tu receta/i }).click();

  await page.locator("#quote-name").fill("Cliente de Prueba QA");
  await page.locator("#quote-phone").fill("+56911112222");
  await page.locator("#quote-email").fill("cliente.qa@axessia-qa.test");
  await page.locator("#quote-rut").fill("12.345.678-5");
  await page.locator("#quote-city").fill("Santiago");
  await page.getByRole("button", { name: /^continuar$/i }).click();

  await expect(page.getByText("¿Qué necesitas?")).toBeVisible();
}

test.describe("Subida controlada de documentos en la solicitud de cotización", () => {
  test("acepta una imagen JPG válida como receta", async ({ page }) => {
    await openQuoteModalToStep2(page);

    await page.locator("#quote-file").setInputFiles({
      name: "sample-image.jpg",
      mimeType: "image/jpeg",
      buffer: readFileSync(path.join(FIXTURES_DIR, "sample-image.jpg")),
    });

    await expect(page.getByText("sample-image.jpg")).toBeVisible();
    await expect(page.getByText(/adjunta un pdf o una imagen válida/i)).toHaveCount(0);
  });

  test("acepta un PDF válido como receta", async ({ page }) => {
    await openQuoteModalToStep2(page);

    await page.locator("#quote-file").setInputFiles(path.join(FIXTURES_DIR, "sample-document.pdf"));

    await expect(page.getByText("sample-document.pdf")).toBeVisible();
    await expect(page.getByText(/adjunta un pdf o una imagen válida/i)).toHaveCount(0);
  });

  test("rechaza un archivo de texto no permitido", async ({ page }) => {
    await openQuoteModalToStep2(page);

    await page.locator("#quote-file").setInputFiles({
      name: "unauthorized-file.txt",
      mimeType: "text/plain",
      buffer: readFileSync(path.join(FIXTURES_DIR, "unauthorized-file.txt")),
    });

    await expect(page.getByText(/adjunta un pdf o una imagen válida/i)).toBeVisible();
  });
});

test.describe("Validación de campos obligatorios al detallar la solicitud", () => {
  test("no avanza al paso de confirmación si falta la receta y los datos del medicamento", async ({ page }) => {
    await openQuoteModalToStep2(page);

    await page.getByRole("button", { name: /revisar solicitud/i }).click();

    await expect(page.getByText(/adjunta tu receta médica/i)).toBeVisible();
    await expect(page.getByText("Obligatorio").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /revisa tu solicitud/i })).toHaveCount(0);
  });
});
