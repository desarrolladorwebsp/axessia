import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  activeClientAlertFromRows,
  formatAlertPersonName,
  mergeStalledAlerts,
  parseActiveClientAlert,
  parseDashboardAlerts,
  toAlertAmount,
  unavailableCollection,
  type StalledRequestAlert,
} from "../../lib/internal-alerts/load";
import {
  isAssignedWithoutQuote,
  isQuoteExpiringSoon,
  isUnassignedStale,
  ONE_DAY_MS,
  THREE_DAYS_MS,
} from "../../lib/internal-alerts/rules";

const now = new Date("2026-09-22T15:00:00.000Z");

describe("cotizaciones próximas a vencer", () => {
  it("incluye una cotización vigente con menos de 3 días", () => {
    assert.equal(isQuoteExpiringSoon({
      status: "SENT",
      validUntil: new Date(now.getTime() + THREE_DAYS_MS - 1),
      now,
    }), true);
  });

  it("excluye la que vence en exactamente 3 días, la ya vencida y la que no tiene fecha", () => {
    assert.equal(isQuoteExpiringSoon({ status: "SENT", validUntil: new Date(now.getTime() + THREE_DAYS_MS), now }), false);
    assert.equal(isQuoteExpiringSoon({ status: "SENT", validUntil: now, now }), false);
    assert.equal(isQuoteExpiringSoon({ status: "SENT", validUntil: new Date(now.getTime() - 1), now }), false);
    assert.equal(isQuoteExpiringSoon({ status: "SENT", validUntil: null, now }), false);
  });

  it("excluye cotizaciones aceptadas, rechazadas, vencidas o anuladas", () => {
    const validUntil = new Date(now.getTime() + ONE_DAY_MS);
    for (const status of ["ACCEPTED", "REJECTED", "EXPIRED", "VOIDED"]) {
      assert.equal(isQuoteExpiringSoon({ status, validUntil, now }), false);
    }
  });
});

describe("solicitudes sin avance", () => {
  it("marca una solicitud sin asignar recibida hace más de un día", () => {
    assert.equal(isUnassignedStale({
      status: "RECEIVED",
      assigned: false,
      createdAt: new Date(now.getTime() - ONE_DAY_MS - 1),
      now,
    }), true);
  });

  it("no marca la que cumple exactamente un día, la asignada o la cerrada", () => {
    assert.equal(isUnassignedStale({
      status: "RECEIVED",
      assigned: false,
      createdAt: new Date(now.getTime() - ONE_DAY_MS),
      now,
    }), false);
    assert.equal(isUnassignedStale({
      status: "SOURCING",
      assigned: true,
      createdAt: new Date(now.getTime() - ONE_DAY_MS * 4),
      now,
    }), false);
    assert.equal(isUnassignedStale({
      status: "COMPLETED",
      assigned: false,
      createdAt: new Date(now.getTime() - ONE_DAY_MS * 4),
      now,
    }), false);
  });

  it("marca una solicitud asignada hace más de 3 días y sin cotización", () => {
    assert.equal(isAssignedWithoutQuote({
      status: "SOURCING",
      assignedAt: new Date(now.getTime() - THREE_DAYS_MS - 1),
      quoteCount: 0,
      now,
    }), true);
  });

  it("no marca si ya tiene cotización, si la asignación no supera 3 días o si está finalizada", () => {
    const assignedAt = new Date(now.getTime() - THREE_DAYS_MS - 1);
    assert.equal(isAssignedWithoutQuote({ status: "SOURCING", assignedAt, quoteCount: 1, now }), false);
    assert.equal(isAssignedWithoutQuote({
      status: "SOURCING",
      assignedAt: new Date(now.getTime() - THREE_DAYS_MS),
      quoteCount: 0,
      now,
    }), true);
    assert.equal(isAssignedWithoutQuote({
      status: "SOURCING",
      assignedAt: new Date(now.getTime() - THREE_DAYS_MS + 1),
      quoteCount: 0,
      now,
    }), false);
    assert.equal(isAssignedWithoutQuote({ status: "CANCELLED", assignedAt, quoteCount: 0, now }), false);
    assert.equal(isAssignedWithoutQuote({ status: "REJECTED", assignedAt, quoteCount: 0, now }), false);
    assert.equal(isAssignedWithoutQuote({ status: "SOURCING", assignedAt: null, quoteCount: 0, now }), false);
  });
});

describe("cliente con solicitudes activas", () => {
  const current = { customerRut: "12.345.678-5", requesterRut: "12.345.678-5" };

  it("aparece solo cuando hay más de 2 solicitudes activas con el mismo RUT", () => {
    const rows = [
      { requesterRut: "123456785" },
      { customerRut: "12.345.678-5", requesterRut: "otro" },
      { requesterRut: "12.345.678-5", status: "SOURCING" },
    ];
    assert.deepEqual(activeClientAlertFromRows(current, rows), { visible: true, activeCount: 3 });
    assert.deepEqual(activeClientAlertFromRows(current, rows.slice(0, 2)), { visible: false, activeCount: 2 });
  });

  it("no considera solicitudes cerradas ni RUTs vacíos", () => {
    const rows = [
      { requesterRut: "12.345.678-5", status: "COMPLETED" },
      { requesterRut: "12.345.678-5", status: "CANCELLED" },
      { requesterRut: "12.345.678-5", status: "REJECTED" },
      { requesterRut: "12.345.678-5", status: "RECEIVED" },
      { requesterRut: "99.999.999-9", status: "RECEIVED" },
    ];
    assert.deepEqual(activeClientAlertFromRows(current, rows), { visible: false, activeCount: 1 });
    assert.deepEqual(activeClientAlertFromRows({ requesterRut: "   " }, [{ requesterRut: "" }, { requesterRut: " " }]), {
      visible: false,
      activeCount: 0,
    });
  });
});

describe("presentación y aislamiento de alertas", () => {
  it("normaliza el monto y el nombre del responsable", () => {
    assert.equal(toAlertAmount({ toString: () => "19990.50" }), 19990.5);
    assert.equal(toAlertAmount(null), null);
    assert.equal(toAlertAmount("no-es-numero"), null);
    assert.equal(formatAlertPersonName({ firstName: "Ana", lastName: "Soto" }, "Sin responsable"), "Ana Soto");
    assert.equal(formatAlertPersonName(null, "Sin asignar"), "Sin asignar");
  });

  it("conserva el total real y limita el listado cuando una revisión falla", () => {
    const unassigned = unavailableCollection<StalledRequestAlert>();
    const withoutQuote = {
      available: true,
      partial: false,
      total: 51,
      items: Array.from({ length: 51 }, (_, index) => stalledItem(index)),
    };

    const merged = mergeStalledAlerts(unassigned, withoutQuote);
    assert.equal(merged.available, true);
    assert.equal(merged.partial, true);
    assert.equal(merged.total, 51);
    assert.equal(merged.items.length, 50);
    assert.equal(merged.items[0]?.requestId, "request-50");
    assert.equal(merged.items.some((item) => item.requestId === "request-0"), false);
  });

  it("oculta la cápsula de solicitudes si ambas revisiones fallan", () => {
    const merged = mergeStalledAlerts(unavailableCollection(), unavailableCollection());
    assert.deepEqual(merged, { available: false, partial: false, total: 0, items: [] });
  });

  it("descarta una respuesta mal formada sin romper el panel", () => {
    assert.equal(parseDashboardAlerts(null).expiringQuotes.available, false);
    assert.equal(parseDashboardAlerts({
      expiringQuotes: {
        available: true,
        total: 1,
        items: [{ quoteId: "q1", requestId: "r1", requestNumber: "S-1", quoteNumber: "C-1", amount: 1000, createdAt: now.toISOString(), responsibleName: "Ana Soto" }],
      },
    }).expiringQuotes.items.length, 1);
    assert.deepEqual(parseActiveClientAlert({ visible: true, activeCount: 2 }), { visible: false, activeCount: 2 });
    assert.deepEqual(parseActiveClientAlert({ visible: true, activeCount: 4 }), { visible: true, activeCount: 4 });
  });
});

function stalledItem(index: number): StalledRequestAlert {
  return {
    requestId: `request-${index}`,
    requestNumber: `S-${index}`,
    reason: "ASSIGNED_WITHOUT_QUOTE",
    createdAt: new Date(now.getTime() - index * 1000).toISOString(),
    responsibleName: "Ana Soto",
  };
}
