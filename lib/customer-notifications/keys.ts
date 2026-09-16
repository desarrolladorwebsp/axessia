export const QUOTE_REMINDER_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;
export const QUOTE_EXPIRY_NOTICE_MS = 24 * 60 * 60 * 1000;
export const CLAIM_IN_FLIGHT_MS = 10 * 60 * 1000;

export function quotePendingReminderKey(quoteId: string, periodIndex: number) {
  return `quote-pending:${quoteId}:p${periodIndex}`;
}

export function quoteExpiringSoonKey(quoteId: string) {
  return `quote-expiring:${quoteId}`;
}

export function requestCompletedKey(requestId: string) {
  return `request-completed:${requestId}`;
}
