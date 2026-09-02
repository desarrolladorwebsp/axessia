import { createHash, randomBytes } from "crypto";
import type { PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Only in-flight gateway attempts block a new start. Failed/cancelled/help remain auditable history.
export const ACTIVE_PAYMENT_STATUSES = ["PENDING", "PROCESSING"] as const;
export const TERMINAL_PAYMENT_STATUSES = ["PAID", "FAILED", "CANCELLED", "HELP_REQUESTED"] as const;

export type PaymentSummary = {
  id: string;
  status: PaymentStatus;
  amount: string;
  currency: string;
  provider: string;
  providerReference: string | null;
  failureReason: string | null;
  helpMessage: string | null;
  paidAt: string | null;
  failedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializePayment(payment: {
  id: string;
  status: PaymentStatus;
  amount: Prisma.Decimal | number | string;
  currency: string;
  provider: string;
  providerReference: string | null;
  failureReason: string | null;
  helpMessage: string | null;
  paidAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): PaymentSummary {
  return {
    id: payment.id,
    status: payment.status,
    amount: payment.amount?.toString?.() ?? String(payment.amount),
    currency: payment.currency,
    provider: payment.provider,
    providerReference: payment.providerReference,
    failureReason: payment.failureReason,
    helpMessage: payment.helpMessage,
    paidAt: payment.paidAt?.toISOString() ?? null,
    failedAt: payment.failedAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

export function createProviderReference(requestId: string) {
  const stamp = Date.now().toString(36);
  const noise = randomBytes(4).toString("hex");
  const digest = createHash("sha256").update(`${requestId}:${stamp}:${noise}`).digest("hex").slice(0, 10);
  return `SIM-${stamp}-${digest}`.toUpperCase();
}

export async function getLatestPaymentForRequest(requestId: string) {
  return prisma.payment.findFirst({
    where: { requestId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getActivePaymentForQuote(quoteId: string) {
  return prisma.payment.findFirst({
    where: {
      quoteId,
      status: { in: [...ACTIVE_PAYMENT_STATUSES] },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Simulated payment gateway outcome.
 * Only marks PAID when the simulated provider returns an explicit success.
 * Starting a payment never marks the request as paid.
 */
export function resolveSimulatedPaymentOutcome(outcome: "success" | "failure" | "cancel") {
  if (outcome === "success") {
    return {
      status: "PAID" as const,
      eventType: "PAYMENT_CONFIRMED",
      failureReason: null,
    };
  }
  if (outcome === "cancel") {
    return {
      status: "CANCELLED" as const,
      eventType: "PAYMENT_CANCELLED",
      failureReason: "El cliente canceló el intento de pago.",
    };
  }
  return {
    status: "FAILED" as const,
    eventType: "PAYMENT_FAILED",
    failureReason: "La pasarela rechazó el pago. Puedes reintentar o solicitar ayuda a AXESSIA.",
  };
}
