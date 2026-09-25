import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { quoteExpiringSoonKey, quotePendingReminderKey, QUOTE_REMINDER_PERIOD_MS } from "../../lib/customer-notifications/keys";
import { decideQuoteReminders } from "../../lib/customer-notifications/schedule";

const sentAt = new Date("2026-09-01T12:00:00.000Z");
const quoteId = "quote-a";

describe("regla de recordatorios de cotización", () => {
  it("no envía recordatorio antes de 3 días desde sentAt, aunque createdAt sea anterior", () => {
    const now = new Date(sentAt.getTime() + QUOTE_REMINDER_PERIOD_MS - 1);
    const decision = decideQuoteReminders({
      quoteId,
      status: "SENT",
      sentAt,
      validUntil: new Date(sentAt.getTime() + 20 * QUOTE_REMINDER_PERIOD_MS),
      now,
    });
    assert.equal(decision.kind, "none");
  });

  it("envía el primer recordatorio al cumplirse 3 días desde el envío real", () => {
    const now = new Date(sentAt.getTime() + QUOTE_REMINDER_PERIOD_MS);
    const decision = decideQuoteReminders({
      quoteId,
      status: "SENT",
      sentAt,
      validUntil: new Date("2026-09-20T12:00:00.000Z"),
      now,
    });
    assert.equal(decision.kind, "pending");
    if (decision.kind === "pending") {
      assert.equal(decision.periodIndex, 1);
      assert.equal(decision.occurrenceKey, quotePendingReminderKey(quoteId, 1));
    }
  });

  it("vuelve a programar un recordatorio cada 3 días mientras siga pendiente", () => {
    const sixthDay = new Date(sentAt.getTime() + QUOTE_REMINDER_PERIOD_MS * 2);
    const decision = decideQuoteReminders({
      quoteId,
      status: "SENT",
      sentAt,
      validUntil: new Date("2026-09-20T12:00:00.000Z"),
      now: sixthDay,
    });
    assert.equal(decision.kind, "pending");
    if (decision.kind === "pending") {
      assert.equal(decision.periodIndex, 2);
      assert.equal(decision.occurrenceKey, quotePendingReminderKey(quoteId, 2));
    }
  });

  it("no envía si la cotización fue aceptada", () => {
    const decision = decideQuoteReminders({
      quoteId,
      status: "ACCEPTED",
      sentAt,
      validUntil: new Date("2026-09-20T12:00:00.000Z"),
      now: new Date(sentAt.getTime() + QUOTE_REMINDER_PERIOD_MS),
    });
    assert.equal(decision.kind, "none");
  });

  it("no envía si la cotización fue rechazada", () => {
    const decision = decideQuoteReminders({
      quoteId,
      status: "REJECTED",
      sentAt,
      validUntil: new Date("2026-09-20T12:00:00.000Z"),
      now: new Date(sentAt.getTime() + QUOTE_REMINDER_PERIOD_MS),
    });
    assert.equal(decision.kind, "none");
  });

  it("no envía si está vencida", () => {
    const now = new Date("2026-09-10T12:00:00.000Z");
    const decision = decideQuoteReminders({
      quoteId,
      status: "SENT",
      sentAt,
      validUntil: new Date("2026-09-10T12:00:00.000Z"),
      now,
    });
    assert.equal(decision.kind, "none");
  });

  it("no envía si nunca fue enviada al cliente", () => {
    const decision = decideQuoteReminders({
      quoteId,
      status: "READY",
      sentAt: null,
      validUntil: new Date("2026-09-20T12:00:00.000Z"),
      now: new Date("2026-09-10T12:00:00.000Z"),
    });
    assert.equal(decision.kind, "none");
  });

  it("envía aviso especial 1 día antes del vencimiento", () => {
    const validUntil = new Date("2026-09-10T15:30:00.000Z");
    const sentRecently = new Date(validUntil.getTime() - 2 * 24 * 60 * 60 * 1000);
    const now = new Date(validUntil.getTime() - 12 * 60 * 60 * 1000);
    const decision = decideQuoteReminders({
      quoteId,
      status: "SENT",
      sentAt: sentRecently,
      validUntil,
      now,
    });
    assert.equal(decision.kind, "expiring");
    if (decision.kind === "expiring") {
      assert.equal(decision.occurrenceKey, quoteExpiringSoonKey(quoteId));
    }
  });

  it("prioriza el aviso de vencimiento cuando coincide con el recordatorio periódico", () => {
    const validUntil = new Date(sentAt.getTime() + QUOTE_REMINDER_PERIOD_MS + 2 * 60 * 60 * 1000);
    const now = new Date(sentAt.getTime() + QUOTE_REMINDER_PERIOD_MS);
    const decision = decideQuoteReminders({
      quoteId,
      status: "SENT",
      sentAt,
      validUntil,
      now,
    });
    assert.equal(decision.kind, "expiring-and-skip-pending");
    if (decision.kind === "expiring-and-skip-pending") {
      assert.equal(decision.expiryKey, quoteExpiringSoonKey(quoteId));
      assert.equal(decision.pendingKey, quotePendingReminderKey(quoteId, 1));
    }
  });
});
