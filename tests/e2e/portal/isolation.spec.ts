import { expect, test } from "@playwright/test";
import { MUTATIONS_ALLOWED, MUTATIONS_SKIP_REASON } from "../../helpers/mutation-gate";
import { createMedicationRequestWithPdf, getRequestDetailUrl, registerAndLoginCustomer } from "../../helpers/portal-flow";

test.describe("Aislamiento de datos entre clientes", () => {
  test.skip(!MUTATIONS_ALLOWED, MUTATIONS_SKIP_REASON);

  test("un cliente no puede ver la solicitud de otro cliente aunque conozca la URL", async ({ browser }) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await registerAndLoginCustomer(pageA, "isoA", Date.now());
    const requestNumber = await createMedicationRequestWithPdf(pageA);
    const detailUrl = await getRequestDetailUrl(pageA, requestNumber);
    await contextA.close();

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await registerAndLoginCustomer(pageB, "isoB", Date.now() + 1);

    await pageB.goto(detailUrl);

    await expect(pageB.getByRole("heading", { name: /no encontramos esa información/i })).toBeVisible();
    await expect(pageB.getByText(new RegExp(requestNumber, "i"))).toHaveCount(0);

    await contextB.close();
  });
});
