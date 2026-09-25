import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { QUOTE_REMINDER_PERIOD_MS } from "../../lib/customer-notifications/keys";
import { dispatchRequestCompletedNotice, notifyRequestCompleted, runCustomerNotificationJob } from "../../lib/customer-notifications/job";
import type { EmailDeliveryResult, QuoteReminderEmailInput, RequestCompletedEmailInput } from "../../lib/customer-notifications/types";
import { completedCandidate, createMemoryCustomerNotificationStore, quoteCandidate } from "./helpers";

type SentMail =
  | { kind: "pending" | "expiring"; payload: QuoteReminderEmailInput }
  | { kind: "completed"; payload: RequestCompletedEmailInput };

function createSenders(options?: { failOnce?: boolean; failAlways?: boolean }) {
  const sent: SentMail[] = [];
  let failedOnce = false;
  const maybeFail = (): EmailDeliveryResult | null => {
    if (options?.failAlways) return { ok: false, error: "Resend rejected email" };
    if (options?.failOnce && !failedOnce) {
      failedOnce = true;
      return { ok: false, error: "Resend rejected email" };
    }
    return null;
  };

  return {
    sent,
    senders: {
      async sendQuotePendingReminder(payload: QuoteReminderEmailInput): Promise<EmailDeliveryResult> {
        const failure = maybeFail();
        if (failure) return failure;
        sent.push({ kind: "pending", payload });
        return { ok: true, providerMessageId: "resend_pending_1" };
      },
      async sendQuoteExpiringSoon(payload: QuoteReminderEmailInput): Promise<EmailDeliveryResult> {
        const failure = maybeFail();
        if (failure) return failure;
        sent.push({ kind: "expiring", payload });
        return { ok: true, providerMessageId: "resend_expiring_1" };
      },
      async sendRequestCompleted(payload: RequestCompletedEmailInput): Promise<EmailDeliveryResult> {
        const failure = maybeFail();
        if (failure) return failure;
        sent.push({ kind: "completed", payload });
        return { ok: true, providerMessageId: "resend_completed_1" };
      },
    },
  };
}

describe("job de notificaciones al cliente", () => {
  it("no envía recordatorio antes de 3 días", async () => {
    const quote = quoteCandidate();
    const store = createMemoryCustomerNotificationStore({ quotes: [quote] });
    const { sent, senders } = createSenders();
    const now = new Date(quote.sentAt!.getTime() + QUOTE_REMINDER_PERIOD_MS - 1000);
    const result = await runCustomerNotificationJob({ now, store, senders });
    assert.equal(result.sent, 0);
    assert.equal(sent.length, 0);
  });

  it("envía el primer recordatorio a los 3 días y lo registra como enviado", async () => {
    const quote = quoteCandidate();
    const store = createMemoryCustomerNotificationStore({ quotes: [quote] });
    const { sent, senders } = createSenders();
    const now = new Date(quote.sentAt!.getTime() + QUOTE_REMINDER_PERIOD_MS);
    const result = await runCustomerNotificationJob({ now, store, senders });
    assert.equal(result.sent, 1);
    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.kind, "pending");
    assert.equal(store.state.notifications[0]?.status, "SENT");
    assert.equal(store.state.notifications[0]?.providerMessageId, "resend_pending_1");
    assert.equal(store.state.events[0]?.eventType, "QUOTE_PENDING_REMINDER_SENT");
  });

  it("vuelve a enviar cada 3 días mientras siga pendiente", async () => {
    const quote = quoteCandidate();
    const store = createMemoryCustomerNotificationStore({ quotes: [quote] });
    const { sent, senders } = createSenders();
    const first = new Date(quote.sentAt!.getTime() + QUOTE_REMINDER_PERIOD_MS);
    const second = new Date(quote.sentAt!.getTime() + QUOTE_REMINDER_PERIOD_MS * 2);
    await runCustomerNotificationJob({ now: first, store, senders });
    await runCustomerNotificationJob({ now: second, store, senders });
    assert.equal(sent.filter((item) => item.kind === "pending").length, 2);
    assert.equal(store.state.notifications.filter((item) => item.status === "SENT").length, 2);
  });

  it("no envía si la cotización fue aceptada, rechazada, vencida o nunca enviada", async () => {
    const sentAt = new Date("2026-09-01T12:00:00.000Z");
    const now = new Date(sentAt.getTime() + QUOTE_REMINDER_PERIOD_MS);
    const store = createMemoryCustomerNotificationStore({
      quotes: [
        quoteCandidate({ quoteId: "accepted", status: "ACCEPTED", sentAt }),
        quoteCandidate({ quoteId: "rejected", status: "REJECTED", sentAt, customerId: "customer-b", recipientEmail: "b@correo.cl" }),
        quoteCandidate({ quoteId: "expired", sentAt, validUntil: new Date(now.getTime() - 1000), customerId: "customer-c", recipientEmail: "c@correo.cl" }),
        quoteCandidate({ quoteId: "draft", status: "READY", sentAt: null, customerId: "customer-d", recipientEmail: "d@correo.cl" }),
      ],
    });
    const { sent, senders } = createSenders();
    const result = await runCustomerNotificationJob({ now, store, senders });
    assert.equal(result.sent, 0);
    assert.equal(sent.length, 0);
  });

  it("envía el aviso de 1 día antes del vencimiento", async () => {
    const validUntil = new Date("2026-09-10T15:30:00.000Z");
    const quote = quoteCandidate({
      sentAt: new Date(validUntil.getTime() - 2 * 24 * 60 * 60 * 1000),
      validUntil,
    });
    const store = createMemoryCustomerNotificationStore({ quotes: [quote] });
    const { sent, senders } = createSenders();
    const now = new Date(validUntil.getTime() - 6 * 60 * 60 * 1000);
    const result = await runCustomerNotificationJob({ now, store, senders });
    assert.equal(result.sent, 1);
    assert.equal(sent[0]?.kind, "expiring");
    assert.equal(store.state.notifications.some((item) => item.type === "QUOTE_EXPIRING_SOON" && item.status === "SENT"), true);
  });

  it("no duplica correos cuando coinciden el recordatorio periódico y el de vencimiento", async () => {
    const sentAt = new Date("2026-09-01T12:00:00.000Z");
    const validUntil = new Date(sentAt.getTime() + QUOTE_REMINDER_PERIOD_MS + 2 * 60 * 60 * 1000);
    const quote = quoteCandidate({ sentAt, validUntil });
    const store = createMemoryCustomerNotificationStore({ quotes: [quote] });
    const { sent, senders } = createSenders();
    const now = new Date(sentAt.getTime() + QUOTE_REMINDER_PERIOD_MS);
    const result = await runCustomerNotificationJob({ now, store, senders });
    assert.equal(result.sent, 1);
    assert.equal(result.skipped, 1);
    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.kind, "expiring");
    assert.equal(store.state.notifications.some((item) => item.type === "QUOTE_PENDING_REMINDER" && item.status === "SKIPPED"), true);
    assert.equal(store.state.notifications.some((item) => item.type === "QUOTE_EXPIRING_SOON" && item.status === "SENT"), true);
  });

  it("ejecutar el job dos veces no duplica una notificación", async () => {
    const quote = quoteCandidate();
    const store = createMemoryCustomerNotificationStore({ quotes: [quote] });
    const { sent, senders } = createSenders();
    const now = new Date(quote.sentAt!.getTime() + QUOTE_REMINDER_PERIOD_MS);
    const first = await runCustomerNotificationJob({ now, store, senders });
    const second = await runCustomerNotificationJob({ now, store, senders });
    assert.equal(first.sent, 1);
    assert.equal(second.sent, 0);
    assert.equal(second.duplicate >= 1, true);
    assert.equal(sent.length, 1);
    assert.equal(store.state.notifications.filter((item) => item.status === "SENT").length, 1);
  });

  it("un error de Resend queda registrado y no se considera envío exitoso", async () => {
    const quote = quoteCandidate();
    const store = createMemoryCustomerNotificationStore({ quotes: [quote] });
    const { sent, senders } = createSenders({ failAlways: true });
    const now = new Date(quote.sentAt!.getTime() + QUOTE_REMINDER_PERIOD_MS);
    const result = await runCustomerNotificationJob({ now, store, senders });
    assert.equal(result.sent, 0);
    assert.equal(result.failed, 1);
    assert.equal(sent.length, 0);
    assert.equal(store.state.notifications[0]?.status, "FAILED");
    assert.equal(store.state.notifications[0]?.sentAt, null);
    assert.equal(store.state.notifications[0]?.providerMessageId, null);
    assert.equal(store.state.notifications[0]?.errorMessage, "Resend rejected email");
    assert.equal(store.state.events.length, 0);
  });

  it("reintenta un fallo de Resend y solo marca enviado tras el éxito", async () => {
    const quote = quoteCandidate();
    const store = createMemoryCustomerNotificationStore({ quotes: [quote] });
    const { sent, senders } = createSenders({ failOnce: true });
    const now = new Date(quote.sentAt!.getTime() + QUOTE_REMINDER_PERIOD_MS);
    const first = await runCustomerNotificationJob({ now, store, senders });
    const second = await runCustomerNotificationJob({ now: new Date(now.getTime() + 1000), store, senders });
    assert.equal(first.failed, 1);
    assert.equal(second.sent, 1);
    assert.equal(sent.length, 1);
    assert.equal(store.state.notifications[0]?.status, "SENT");
    assert.equal(store.state.notifications[0]?.providerMessageId, "resend_pending_1");
  });

  it("finalizar una solicitud genera su notificación una sola vez", async () => {
    const request = completedCandidate();
    const store = createMemoryCustomerNotificationStore({ completed: [request] });
    const { sent, senders } = createSenders();
    const first = await notifyRequestCompleted(request.requestId, { store, senders, now: new Date("2026-09-15T12:00:00.000Z") });
    const second = await dispatchRequestCompletedNotice(request, { store, senders, now: new Date("2026-09-15T12:05:00.000Z") });
    const third = await runCustomerNotificationJob({ store, senders, now: new Date("2026-09-15T12:10:00.000Z") });
    assert.equal(first.sent, 1);
    assert.equal(second.sent, 0);
    assert.equal(third.sent, 0);
    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.kind, "completed");
    assert.equal(store.state.notifications.filter((item) => item.type === "REQUEST_COMPLETED" && item.status === "SENT").length, 1);
    assert.equal(store.state.events[0]?.eventType, "REQUEST_COMPLETED_EMAIL_SENT");
  });

  it("un cliente nunca recibe información de otro cliente", async () => {
    const quoteA = quoteCandidate({
      quoteId: "quote-a",
      quoteNumber: "C-AAA",
      customerId: "customer-a",
      customerName: "Ana Pérez",
      recipientEmail: "ana@correo.cl",
      requestId: "request-a",
      requestNumber: "SOL-AAA",
    });
    const quoteB = quoteCandidate({
      quoteId: "quote-b",
      quoteNumber: "C-BBB",
      customerId: "customer-b",
      customerName: "Bruno Soto",
      recipientEmail: "bruno@correo.cl",
      requestId: "request-b",
      requestNumber: "SOL-BBB",
    });
    const store = createMemoryCustomerNotificationStore({ quotes: [quoteA, quoteB] });
    const { sent, senders } = createSenders();
    const now = new Date(quoteA.sentAt!.getTime() + QUOTE_REMINDER_PERIOD_MS);
    await runCustomerNotificationJob({ now, store, senders });
    assert.equal(sent.length, 2);
    const mailA = sent.find((item) => item.kind === "pending" && item.payload.customerEmail === "ana@correo.cl");
    const mailB = sent.find((item) => item.kind === "pending" && item.payload.customerEmail === "bruno@correo.cl");
    assert.ok(mailA && mailA.kind === "pending");
    assert.ok(mailB && mailB.kind === "pending");
    assert.equal(mailA.payload.quoteNumber, "C-AAA");
    assert.equal(mailB.payload.quoteNumber, "C-BBB");
    assert.equal(mailA.payload.quoteUrl.includes("quote-a"), true);
    assert.equal(mailB.payload.quoteUrl.includes("quote-b"), true);
    assert.equal(mailA.payload.quoteUrl.includes("quote-b"), false);
    assert.equal(mailB.payload.quoteUrl.includes("quote-a"), false);
    assert.notEqual(mailA.payload.customerEmail, mailB.payload.customerEmail);
  });
});

