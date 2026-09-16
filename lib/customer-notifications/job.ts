import { requestCompletedKey } from "@/lib/customer-notifications/keys";
import { prismaCustomerNotificationStore } from "@/lib/customer-notifications/prisma-store";
import { decideQuoteReminders } from "@/lib/customer-notifications/schedule";
import type {
  ClaimOccurrenceInput,
  CompletedRequestCandidate,
  CustomerEmailNotificationType,
  CustomerNotificationStore,
  EmailDeliveryResult,
  QuoteReminderCandidate,
  QuoteReminderEmailInput,
  RequestCompletedEmailInput,
  RequestHistoryEventInput,
} from "@/lib/customer-notifications/types";
import { portalQuoteUrl, portalRequestUrl } from "@/lib/customer-notifications/urls";
import {
  sendQuoteExpiringSoonEmail,
  sendQuotePendingReminderEmail,
  sendRequestCompletedEmail,
  type SendEmailResult,
} from "@/lib/services/email";
import { formatQuoteValidityLabel } from "@/lib/services/customer-notification-emails";

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export type CustomerNotificationJobResult = {
  sent: number;
  failed: number;
  skipped: number;
  duplicate: number;
};

export type CustomerNotificationSenders = {
  sendQuotePendingReminder: (input: QuoteReminderEmailInput) => Promise<EmailDeliveryResult>;
  sendQuoteExpiringSoon: (input: QuoteReminderEmailInput) => Promise<EmailDeliveryResult>;
  sendRequestCompleted: (input: RequestCompletedEmailInput) => Promise<EmailDeliveryResult>;
};

export type CustomerNotificationJobDeps = {
  now?: Date;
  store?: CustomerNotificationStore;
  senders?: CustomerNotificationSenders;
};

async function deliver(promise: Promise<SendEmailResult>): Promise<EmailDeliveryResult> {
  try {
    const result = await promise;
    return { ok: true, providerMessageId: result.providerMessageId };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function productionSenders(): CustomerNotificationSenders {
  return {
    sendQuotePendingReminder: (input) =>
      deliver(
        sendQuotePendingReminderEmail({
          customerEmail: input.customerEmail,
          customerName: input.customerName,
          quoteNumber: input.quoteNumber,
          validUntilLabel: input.validUntilLabel,
          quoteUrl: input.quoteUrl,
        }),
      ),
    sendQuoteExpiringSoon: (input) =>
      deliver(
        sendQuoteExpiringSoonEmail({
          customerEmail: input.customerEmail,
          customerName: input.customerName,
          quoteNumber: input.quoteNumber,
          validUntilLabel: input.validUntilLabel,
          quoteUrl: input.quoteUrl,
        }),
      ),
    sendRequestCompleted: (input) =>
      deliver(
        sendRequestCompletedEmail({
          customerEmail: input.customerEmail,
          customerName: input.customerName,
          requestNumber: input.requestNumber,
          requestUrl: input.requestUrl,
        }),
      ),
  };
}

function resolveDeps(deps: CustomerNotificationJobDeps = {}) {
  return {
    now: deps.now ?? new Date(),
    store: deps.store ?? prismaCustomerNotificationStore,
    senders: deps.senders ?? productionSenders(),
  };
}

function historyStatus(status: string): RequestHistoryEventInput["status"] {
  switch (status) {
    case "RECEIVED":
    case "SOURCING":
    case "QUOTED":
    case "AWAITING_DECISION":
    case "ACCEPTED":
    case "SHIPPING":
    case "REJECTED":
    case "CANCELLED":
    case "COMPLETED":
      return status;
    default:
      return "AWAITING_DECISION";
  }
}

async function dispatchOccurrence(input: {
  now: Date;
  store: CustomerNotificationStore;
  occurrenceKey: string;
  type: CustomerEmailNotificationType;
  customerId: string | null;
  quoteId: string | null;
  requestId: string;
  requestStatus: string;
  recipientEmail: string;
  eventType: string;
  note: string;
  send: () => Promise<EmailDeliveryResult>;
  result: CustomerNotificationJobResult;
}) {
  const claimInput: ClaimOccurrenceInput = {
    occurrenceKey: input.occurrenceKey,
    type: input.type,
    customerId: input.customerId,
    quoteId: input.quoteId,
    requestId: input.requestId,
    recipientEmail: input.recipientEmail,
    now: input.now,
  };
  const claim = await input.store.claimOccurrence(claimInput);
  if (claim === "already-done" || claim === "in-flight") {
    input.result.duplicate += 1;
    return;
  }

  if (!EMAIL_PATTERN.test(input.recipientEmail.trim())) {
    await input.store.markFailed(input.occurrenceKey, "El correo del cliente no es válido.");
    input.result.failed += 1;
    return;
  }

  const delivery = await input.send();
  if (!delivery.ok) {
    await input.store.markFailed(input.occurrenceKey, delivery.error);
    input.result.failed += 1;
    return;
  }

  await input.store.markSent(input.occurrenceKey, delivery.providerMessageId, input.now);
  await input.store.appendRequestEvent({
    requestId: input.requestId,
    status: historyStatus(input.requestStatus),
    eventType: input.eventType,
    note: input.note,
  });
  input.result.sent += 1;
}

async function skipOccurrence(input: {
  now: Date;
  store: CustomerNotificationStore;
  occurrenceKey: string;
  type: CustomerEmailNotificationType;
  customerId: string | null;
  quoteId: string | null;
  requestId: string;
  recipientEmail: string;
  result: CustomerNotificationJobResult;
}) {
  const claim = await input.store.claimOccurrence({
    occurrenceKey: input.occurrenceKey,
    type: input.type,
    status: "SKIPPED",
    customerId: input.customerId,
    quoteId: input.quoteId,
    requestId: input.requestId,
    recipientEmail: input.recipientEmail,
    now: input.now,
  });
  if (claim === "claimed") input.result.skipped += 1;
  else input.result.duplicate += 1;
}

function reminderEmailInput(quote: QuoteReminderCandidate): QuoteReminderEmailInput {
  return {
    customerName: quote.customerName,
    customerEmail: quote.recipientEmail,
    quoteNumber: quote.quoteNumber,
    validUntilLabel: formatQuoteValidityLabel(quote.validUntil),
    quoteUrl: portalQuoteUrl(quote.quoteId),
  };
}

async function processQuoteCandidate(
  quote: QuoteReminderCandidate,
  now: Date,
  store: CustomerNotificationStore,
  senders: CustomerNotificationSenders,
  result: CustomerNotificationJobResult,
) {
  const decision = decideQuoteReminders({
    quoteId: quote.quoteId,
    status: quote.status,
    sentAt: quote.sentAt,
    validUntil: quote.validUntil,
    now,
  });
  if (decision.kind === "none") return;

  const email = reminderEmailInput(quote);

  if (decision.kind === "expiring-and-skip-pending") {
    await skipOccurrence({
      now,
      store,
      occurrenceKey: decision.pendingKey,
      type: "QUOTE_PENDING_REMINDER",
      customerId: quote.customerId,
      quoteId: quote.quoteId,
      requestId: quote.requestId,
      recipientEmail: quote.recipientEmail,
      result,
    });
    await dispatchOccurrence({
      now,
      store,
      occurrenceKey: decision.expiryKey,
      type: "QUOTE_EXPIRING_SOON",
      customerId: quote.customerId,
      quoteId: quote.quoteId,
      requestId: quote.requestId,
      requestStatus: quote.requestStatus,
      recipientEmail: quote.recipientEmail,
      eventType: "QUOTE_EXPIRING_SOON_SENT",
      note: `Aviso de vencimiento próximo enviado a ${quote.recipientEmail}.`,
      send: () => senders.sendQuoteExpiringSoon(email),
      result,
    });
    return;
  }

  if (decision.kind === "expiring") {
    await dispatchOccurrence({
      now,
      store,
      occurrenceKey: decision.occurrenceKey,
      type: "QUOTE_EXPIRING_SOON",
      customerId: quote.customerId,
      quoteId: quote.quoteId,
      requestId: quote.requestId,
      requestStatus: quote.requestStatus,
      recipientEmail: quote.recipientEmail,
      eventType: "QUOTE_EXPIRING_SOON_SENT",
      note: `Aviso de vencimiento próximo enviado a ${quote.recipientEmail}.`,
      send: () => senders.sendQuoteExpiringSoon(email),
      result,
    });
    return;
  }

  await dispatchOccurrence({
    now,
    store,
    occurrenceKey: decision.occurrenceKey,
    type: "QUOTE_PENDING_REMINDER",
    customerId: quote.customerId,
    quoteId: quote.quoteId,
    requestId: quote.requestId,
    requestStatus: quote.requestStatus,
    recipientEmail: quote.recipientEmail,
    eventType: "QUOTE_PENDING_REMINDER_SENT",
    note: `Recordatorio de cotización pendiente enviado a ${quote.recipientEmail}.`,
    send: () => senders.sendQuotePendingReminder(email),
    result,
  });
}

export async function dispatchRequestCompletedNotice(
  request: CompletedRequestCandidate,
  deps: CustomerNotificationJobDeps = {},
) {
  const { now, store, senders } = resolveDeps(deps);
  const result: CustomerNotificationJobResult = { sent: 0, failed: 0, skipped: 0, duplicate: 0 };
  if (request.requestStatus !== "COMPLETED") return result;

  await dispatchOccurrence({
    now,
    store,
    occurrenceKey: requestCompletedKey(request.requestId),
    type: "REQUEST_COMPLETED",
    customerId: request.customerId,
    quoteId: null,
    requestId: request.requestId,
    requestStatus: request.requestStatus,
    recipientEmail: request.recipientEmail,
    eventType: "REQUEST_COMPLETED_EMAIL_SENT",
    note: `Aviso de solicitud finalizada enviado a ${request.recipientEmail}.`,
    send: () =>
      senders.sendRequestCompleted({
        customerName: request.customerName,
        customerEmail: request.recipientEmail,
        requestNumber: request.requestNumber,
        requestUrl: portalRequestUrl(request.requestId),
      }),
    result,
  });

  return result;
}

export async function notifyRequestCompleted(requestId: string, deps: CustomerNotificationJobDeps = {}) {
  const { store } = resolveDeps(deps);
  const request = await store.getCompletedRequest(requestId);
  if (!request) return { sent: 0, failed: 0, skipped: 0, duplicate: 0 };
  return dispatchRequestCompletedNotice(request, deps);
}

export async function runCustomerNotificationJob(deps: CustomerNotificationJobDeps = {}): Promise<CustomerNotificationJobResult> {
  const { now, store, senders } = resolveDeps(deps);
  const result: CustomerNotificationJobResult = { sent: 0, failed: 0, skipped: 0, duplicate: 0 };

  const quotes = await store.listPendingQuoteReminders(now);
  for (const quote of quotes) {
    try {
      await processQuoteCandidate(quote, now, store, senders, result);
    } catch (error) {
      console.error("[CustomerNotifications] Failed to process quote reminder:", {
        quoteId: quote.quoteId,
        error: error instanceof Error ? error.message : String(error),
      });
      result.failed += 1;
    }
  }

  const completed = await store.listCompletedRequestsNeedingNotice();
  for (const request of completed) {
    try {
      const completedResult = await dispatchRequestCompletedNotice(request, { now, store, senders });
      result.sent += completedResult.sent;
      result.failed += completedResult.failed;
      result.skipped += completedResult.skipped;
      result.duplicate += completedResult.duplicate;
    } catch (error) {
      console.error("[CustomerNotifications] Failed to process completed request:", {
        requestId: request.requestId,
        error: error instanceof Error ? error.message : String(error),
      });
      result.failed += 1;
    }
  }

  return result;
}
