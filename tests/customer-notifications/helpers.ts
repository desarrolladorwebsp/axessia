import { CLAIM_IN_FLIGHT_MS } from "../../lib/customer-notifications/keys";
import type {
  ClaimOccurrenceInput,
  ClaimResult,
  CompletedRequestCandidate,
  CustomerEmailNotificationStatus,
  CustomerEmailNotificationType,
  CustomerNotificationStore,
  QuoteReminderCandidate,
  RequestHistoryEventInput,
} from "../../lib/customer-notifications/types";

export type MemoryNotification = {
  occurrenceKey: string;
  type: CustomerEmailNotificationType;
  status: CustomerEmailNotificationStatus;
  customerId: string | null;
  quoteId: string | null;
  requestId: string | null;
  recipientEmail: string;
  providerMessageId: string | null;
  errorMessage: string | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MemoryStoreState = {
  quotes: QuoteReminderCandidate[];
  completed: CompletedRequestCandidate[];
  notifications: MemoryNotification[];
  events: RequestHistoryEventInput[];
};

export function createMemoryCustomerNotificationStore(seed?: Partial<MemoryStoreState>) {
  const state: MemoryStoreState = {
    quotes: [...(seed?.quotes ?? [])],
    completed: [...(seed?.completed ?? [])],
    notifications: [...(seed?.notifications ?? [])],
    events: [...(seed?.events ?? [])],
  };

  const store: CustomerNotificationStore & { state: MemoryStoreState } = {
    state,
    async listPendingQuoteReminders() {
      return state.quotes.filter(
        (quote) => quote.status === "SENT" && quote.sentAt && quote.requestStatus === "AWAITING_DECISION",
      );
    },
    async listCompletedRequestsNeedingNotice() {
      return state.completed.filter((request) => {
        if (request.requestStatus !== "COMPLETED") return false;
        return !state.notifications.some(
          (notification) =>
            notification.requestId === request.requestId &&
            notification.type === "REQUEST_COMPLETED" &&
            notification.status === "SENT",
        );
      });
    },
    async getCompletedRequest(requestId) {
      const request = state.completed.find((item) => item.requestId === requestId) ?? null;
      if (!request || request.requestStatus !== "COMPLETED") return null;
      return request;
    },
    async claimOccurrence(input: ClaimOccurrenceInput): Promise<ClaimResult> {
      const desiredStatus = input.status ?? "PENDING";
      const existing = state.notifications.find((item) => item.occurrenceKey === input.occurrenceKey);
      if (!existing) {
        state.notifications.push({
          occurrenceKey: input.occurrenceKey,
          type: input.type,
          status: desiredStatus,
          customerId: input.customerId,
          quoteId: input.quoteId,
          requestId: input.requestId,
          recipientEmail: input.recipientEmail,
          providerMessageId: null,
          errorMessage: null,
          sentAt: null,
          createdAt: input.now,
          updatedAt: input.now,
        });
        return "claimed";
      }

      if (existing.status === "SENT" || existing.status === "SKIPPED") return "already-done";
      if (desiredStatus === "SKIPPED") return "already-done";
      if (existing.status === "PENDING" && input.now.getTime() - existing.updatedAt.getTime() < CLAIM_IN_FLIGHT_MS) {
        return "in-flight";
      }

      existing.status = "PENDING";
      existing.errorMessage = null;
      existing.type = input.type;
      existing.customerId = input.customerId;
      existing.quoteId = input.quoteId;
      existing.requestId = input.requestId;
      existing.recipientEmail = input.recipientEmail;
      existing.updatedAt = input.now;
      return "claimed";
    },
    async markSent(occurrenceKey, providerMessageId, sentAt) {
      const existing = state.notifications.find((item) => item.occurrenceKey === occurrenceKey);
      if (!existing) throw new Error(`Missing notification ${occurrenceKey}`);
      existing.status = "SENT";
      existing.providerMessageId = providerMessageId;
      existing.sentAt = sentAt;
      existing.errorMessage = null;
      existing.updatedAt = sentAt;
    },
    async markFailed(occurrenceKey, errorMessage) {
      const existing = state.notifications.find((item) => item.occurrenceKey === occurrenceKey);
      if (!existing) throw new Error(`Missing notification ${occurrenceKey}`);
      existing.status = "FAILED";
      existing.sentAt = null;
      existing.providerMessageId = null;
      existing.errorMessage = errorMessage;
      existing.updatedAt = new Date();
    },
    async appendRequestEvent(input) {
      state.events.push(input);
    },
  };

  return store;
}

export function quoteCandidate(overrides: Partial<QuoteReminderCandidate> = {}): QuoteReminderCandidate {
  return {
    quoteId: "quote-a",
    quoteNumber: "C-10001",
    customerId: "customer-a",
    customerName: "Ana Pérez",
    recipientEmail: "ana@correo.cl",
    requestId: "request-a",
    requestNumber: "SOL-10001",
    requestStatus: "AWAITING_DECISION",
    status: "SENT",
    sentAt: new Date("2026-09-01T12:00:00.000Z"),
    validUntil: new Date("2026-09-20T12:00:00.000Z"),
    ...overrides,
  };
}

export function completedCandidate(overrides: Partial<CompletedRequestCandidate> = {}): CompletedRequestCandidate {
  return {
    requestId: "request-a",
    requestNumber: "SOL-10001",
    requestStatus: "COMPLETED",
    customerId: "customer-a",
    customerName: "Ana Pérez",
    recipientEmail: "ana@correo.cl",
    ...overrides,
  };
}
