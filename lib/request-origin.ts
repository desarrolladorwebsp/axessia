import type { QuoteRequestOrigin } from "@prisma/client";

/**
 * A customer session takes precedence over a stale internal session cookie.
 * This matters when an executive and a customer use the same browser profile.
 */
export function resolveQuoteRequestOrigin({
  hasCustomerSession,
  hasInternalActor,
}: {
  hasCustomerSession: boolean;
  hasInternalActor: boolean;
}): QuoteRequestOrigin {
  return hasCustomerSession ? "WEB" : hasInternalActor ? "EJECUTIVO" : "WEB";
}
