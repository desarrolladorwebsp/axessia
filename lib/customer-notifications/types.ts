export type CustomerEmailNotificationType = "QUOTE_PENDING_REMINDER" | "QUOTE_EXPIRING_SOON" | "REQUEST_COMPLETED";
export type CustomerEmailNotificationStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED";

export type QuoteReminderCandidate = {
  quoteId: string;
  quoteNumber: string;
  customerId: string;
  customerName: string;
  recipientEmail: string;
  requestId: string;
  requestNumber: string;
  requestStatus: string;
  status: string;
  sentAt: Date | null;
  validUntil: Date | null;
};

export type CompletedRequestCandidate = {
  requestId: string;
  requestNumber: string;
  requestStatus: string;
  customerId: string | null;
  customerName: string;
  recipientEmail: string;
};

export type ClaimResult = "claimed" | "already-done" | "in-flight";

export type ClaimOccurrenceInput = {
  occurrenceKey: string;
  type: CustomerEmailNotificationType;
  status?: Extract<CustomerEmailNotificationStatus, "PENDING" | "SKIPPED">;
  customerId: string | null;
  quoteId: string | null;
  requestId: string | null;
  recipientEmail: string;
  now: Date;
};

export type RequestHistoryEventInput = {
  requestId: string;
  status: "RECEIVED" | "SOURCING" | "QUOTED" | "AWAITING_DECISION" | "ACCEPTED" | "SHIPPING" | "REJECTED" | "CANCELLED" | "COMPLETED";
  eventType: string;
  note: string;
};

export type CustomerNotificationStore = {
  listPendingQuoteReminders(now: Date): Promise<QuoteReminderCandidate[]>;
  listCompletedRequestsNeedingNotice(): Promise<CompletedRequestCandidate[]>;
  getCompletedRequest(requestId: string): Promise<CompletedRequestCandidate | null>;
  claimOccurrence(input: ClaimOccurrenceInput): Promise<ClaimResult>;
  markSent(occurrenceKey: string, providerMessageId: string | null, sentAt: Date): Promise<void>;
  markFailed(occurrenceKey: string, errorMessage: string): Promise<void>;
  appendRequestEvent(input: RequestHistoryEventInput): Promise<void>;
};

export type EmailDeliveryResult =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; error: string };

export type QuoteReminderEmailInput = {
  customerName: string;
  customerEmail: string;
  quoteNumber: string;
  validUntilLabel: string;
  quoteUrl: string;
};

export type RequestCompletedEmailInput = {
  customerName: string;
  customerEmail: string;
  requestNumber: string;
  requestUrl: string;
};
