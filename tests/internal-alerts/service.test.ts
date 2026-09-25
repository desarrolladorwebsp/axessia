import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";
import {
  guardAlert,
  loadActiveClientAlertFromReader,
  loadDashboardInternalAlertsFromReader,
  type InternalAlertsReader,
} from "../../lib/internal-alerts/load";

const now = new Date("2026-09-22T15:00:00.000Z");

function reader(overrides: Partial<InternalAlertsReader> = {}): InternalAlertsReader {
  return {
    readExpiringQuotes: async () => ({
      total: 1,
      items: [{
        quoteId: "quote-1",
        requestId: "request-1",
        requestNumber: "S-100001",
        quoteNumber: "C-100001",
        amount: 25000,
        createdAt: now.toISOString(),
        responsibleName: "Ana Soto",
      }],
    }),
    readUnassignedStale: async () => ({
      total: 1,
      items: [{
        requestId: "request-2",
        requestNumber: "S-100002",
        reason: "UNASSIGNED",
        createdAt: now.toISOString(),
        responsibleName: "Sin asignar",
      }],
    }),
    readAssignedWithoutQuote: async () => ({ total: 0, items: [] }),
    ...overrides,
  };
}

describe("carga aislada de alertas internas", () => {
  it("devuelve las alertas disponibles cuando las lecturas responden", async () => {
    const alerts = await loadDashboardInternalAlertsFromReader(reader(), now);
    assert.equal(alerts.expiringQuotes.available, true);
    assert.equal(alerts.expiringQuotes.total, 1);
    assert.equal(alerts.expiringQuotes.items[0]?.quoteNumber, "C-100001");
    assert.equal(alerts.stalledRequests.available, true);
    assert.equal(alerts.stalledRequests.partial, false);
    assert.equal(alerts.stalledRequests.total, 1);
  });

  it("mantiene las demás alertas cuando una lectura falla", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const alerts = await loadDashboardInternalAlertsFromReader(reader({
      readExpiringQuotes: async () => {
        throw new Error("base no disponible");
      },
    }), now);

    assert.equal(alerts.expiringQuotes.available, false);
    assert.equal(alerts.expiringQuotes.total, 0);
    assert.equal(alerts.stalledRequests.available, true);
    assert.equal(alerts.stalledRequests.total, 1);
    errorSpy.mockRestore();
  });

  it("no propaga el fallo de la etiqueta de cliente", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const hidden = await loadActiveClientAlertFromReader(async () => {
      throw new Error("consulta interrumpida");
    });
    const fallback = await guardAlert("prueba", { ok: false }, async () => {
      throw new Error("falla controlada");
    });

    assert.deepEqual(hidden, { visible: false, activeCount: 0 });
    assert.deepEqual(fallback, { ok: false });
    errorSpy.mockRestore();
  });
});
