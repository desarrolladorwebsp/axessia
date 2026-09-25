import { expect, test } from "@playwright/test";
import { MUTATIONS_ALLOWED, MUTATIONS_SKIP_REASON } from "../../helpers/mutation-gate";
import { createMedicationRequestWithPdf, getRequestDetailUrl, registerAndLoginCustomer } from "../../helpers/portal-flow";

test.describe("Creación y visualización de una solicitud de cotización", () => {
  test.skip(!MUTATIONS_ALLOWED, MUTATIONS_SKIP_REASON);

  test("un cliente autenticado crea una solicitud con receta en PDF y la ve en su panel", async ({ page }) => {
    await registerAndLoginCustomer(page, "createreq", Date.now());

    const requestNumber = await createMedicationRequestWithPdf(page, {
      name: "Panadol QA",
      activeIngredient: "Paracetamol",
      concentration: "500mg",
    });
    expect(requestNumber).toMatch(/^S-\d+$/);

    const detailUrl = await getRequestDetailUrl(page, requestNumber);
    await page.goto(detailUrl);

    await expect(page.getByRole("heading", { name: requestNumber })).toBeVisible();
    await expect(page.getByText("Panadol QA")).toBeVisible();
  });
});
