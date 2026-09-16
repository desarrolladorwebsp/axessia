import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { authorizeCronRequest } from "../../lib/customer-notifications/cron-auth";

describe("autorización del cron de notificaciones", () => {
  it("rechaza si CRON_SECRET no está configurado o el bearer no coincide", () => {
    const previous = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    try {
      const request = new Request("https://axessia.cl/api/cron/customer-notifications", {
        headers: { authorization: "Bearer test-secret" },
      });
      assert.equal(authorizeCronRequest(request), false);
    } finally {
      process.env.CRON_SECRET = previous;
    }

    process.env.CRON_SECRET = "test-secret";
    try {
      const unauthorized = new Request("https://axessia.cl/api/cron/customer-notifications");
      const wrong = new Request("https://axessia.cl/api/cron/customer-notifications", {
        headers: { authorization: "Bearer other" },
      });
      const authorized = new Request("https://axessia.cl/api/cron/customer-notifications", {
        headers: { authorization: "Bearer test-secret" },
      });
      assert.equal(authorizeCronRequest(unauthorized), false);
      assert.equal(authorizeCronRequest(wrong), false);
      assert.equal(authorizeCronRequest(authorized), true);
    } finally {
      process.env.CRON_SECRET = previous;
    }
  });
});
