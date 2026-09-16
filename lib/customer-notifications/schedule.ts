import { quoteExpiringSoonKey, quotePendingReminderKey, QUOTE_EXPIRY_NOTICE_MS, QUOTE_REMINDER_PERIOD_MS } from "@/lib/customer-notifications/keys";

const REMINDABLE_QUOTE_STATUS = "SENT";

export type QuoteReminderInput = {
  quoteId: string;
  status: string;
  sentAt: Date | null;
  validUntil: Date | null;
  now: Date;
};

export type QuoteReminderDecision =
  | { kind: "none" }
  | { kind: "pending"; periodIndex: number; occurrenceKey: string }
  | { kind: "expiring"; occurrenceKey: string }
  | {
      kind: "expiring-and-skip-pending";
      periodIndex: number;
      expiryKey: string;
      pendingKey: string;
    };

export function isQuoteExpiredForReminders(validUntil: Date | null, now: Date) {
  return Boolean(validUntil && validUntil.getTime() <= now.getTime());
}

export function currentReminderPeriodIndex(sentAt: Date, now: Date) {
  const elapsed = now.getTime() - sentAt.getTime();
  if (elapsed < QUOTE_REMINDER_PERIOD_MS) return 0;
  return Math.floor(elapsed / QUOTE_REMINDER_PERIOD_MS);
}

export function isExpiryNoticeWindow(validUntil: Date | null, now: Date) {
  if (!validUntil) return false;
  const until = validUntil.getTime();
  const start = until - QUOTE_EXPIRY_NOTICE_MS;
  const current = now.getTime();
  return current >= start && current < until;
}

export function decideQuoteReminders(input: QuoteReminderInput): QuoteReminderDecision {
  if (input.status !== REMINDABLE_QUOTE_STATUS || !input.sentAt) {
    return { kind: "none" };
  }

  if (isQuoteExpiredForReminders(input.validUntil, input.now)) {
    return { kind: "none" };
  }

  const periodIndex = currentReminderPeriodIndex(input.sentAt, input.now);
  const pendingDue = periodIndex >= 1;
  const expiringDue = isExpiryNoticeWindow(input.validUntil, input.now);

  if (expiringDue && pendingDue) {
    return {
      kind: "expiring-and-skip-pending",
      periodIndex,
      expiryKey: quoteExpiringSoonKey(input.quoteId),
      pendingKey: quotePendingReminderKey(input.quoteId, periodIndex),
    };
  }

  if (expiringDue) {
    return { kind: "expiring", occurrenceKey: quoteExpiringSoonKey(input.quoteId) };
  }

  if (pendingDue) {
    return {
      kind: "pending",
      periodIndex,
      occurrenceKey: quotePendingReminderKey(input.quoteId, periodIndex),
    };
  }

  return { kind: "none" };
}
