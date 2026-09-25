import { DomainError } from "@/lib/domain-error";
import { prisma } from "@/lib/prisma";
import {
  sendInternalQuoteAcceptedNotification,
  sendInternalQuoteRejectedNotification,
  sendQuoteAcceptedEmail,
  sendQuoteRejectedEmail,
} from "@/lib/services/email";

export function pickDecisionQuote<T extends { status: string; validUntil: Date | null }>(quotes: T[]) {
  return quotes.find((quote) => quote.status === "SENT") ?? null;
}

export function pickAcceptedQuote<T extends { status: string }>(quotes: T[]) {
  return quotes.find((quote) => quote.status === "ACCEPTED") ?? null;
}

export type QuoteDecisionEvaluation =
  | { allowed: true }
  | { allowed: false; status: number; message: string; expired?: boolean };

export function evaluateQuoteDecision(input: {
  requestStatus: string;
  quoteStatus?: string | null;
  validUntil?: Date | null;
  now?: Date;
}): QuoteDecisionEvaluation {
  if (!input.quoteStatus || input.requestStatus !== "AWAITING_DECISION" || input.quoteStatus !== "SENT") {
    return {
      allowed: false,
      status: 409,
      message: "Esta cotización ya no está disponible para decisión.",
    };
  }

  const now = input.now ?? new Date();
  if (input.validUntil && input.validUntil < now) {
    return {
      allowed: false,
      status: 409,
      message: "Esta cotización ya no está vigente.",
      expired: true,
    };
  }

  return { allowed: true };
}

type QuoteDecisionRecord = {
  id: string;
  requestNumber: string | null;
  status: string;
  requesterName: string;
  requesterEmail: string;
  customerId?: string | null;
};

type QuoteDecisionQuote = {
  id: string;
  quoteNumber: string | null;
  version: number;
  status: string;
  validUntil: Date | null;
};

export async function decideQuote(input: {
  request: QuoteDecisionRecord;
  quote: QuoteDecisionQuote;
  action: "accept" | "reject";
  comment: string;
  expectedQuoteId?: string;
}) {
  if (input.action === "reject" && !input.comment) {
    throw new DomainError("El motivo de rechazo es obligatorio.", 400);
  }
  if (input.expectedQuoteId && input.expectedQuoteId !== input.quote.id) {
    throw new DomainError("Esta cotización ya no está disponible para decisión.", 409);
  }

  const evaluation = evaluateQuoteDecision({
    requestStatus: input.request.status,
    quoteStatus: input.quote.status,
    validUntil: input.quote.validUntil,
  });

  if (!evaluation.allowed && evaluation.expired) {
    await prisma.$transaction([
      prisma.quote.update({ where: { id: input.quote.id }, data: { status: "EXPIRED" } }),
      prisma.quoteRequestEvent.create({
        data: {
          requestId: input.request.id,
          status: input.request.status as "AWAITING_DECISION",
          eventType: "QUOTE_EXPIRED",
          note: "El cliente intentó responder una cotización vencida.",
        },
      }),
    ]);
    throw new DomainError(evaluation.message, evaluation.status);
  }

  if (!evaluation.allowed) {
    throw new DomainError(evaluation.message, evaluation.status);
  }

  if (!input.request.requestNumber) {
    throw new DomainError("La solicitud no tiene un identificador público válido.", 409);
  }

  const nextRequestStatus = input.action === "accept" ? "ACCEPTED" : "REJECTED";
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const current = await tx.quote.findUnique({
      where: { id: input.quote.id },
      select: {
        status: true,
        validUntil: true,
        request: { select: { status: true, customerId: true } },
      },
    });

    if (!current) {
      throw new DomainError("Esta cotización ya no está disponible para decisión.", 409);
    }

    const currentEvaluation = evaluateQuoteDecision({
      requestStatus: current.request.status,
      quoteStatus: current.status,
      validUntil: current.validUntil,
      now,
    });

    if (!currentEvaluation.allowed) {
      throw new DomainError(currentEvaluation.message, currentEvaluation.status);
    }

    await tx.quote.update({
      where: { id: input.quote.id },
      data: {
        status: input.action === "accept" ? "ACCEPTED" : "REJECTED",
        acceptedAt: input.action === "accept" ? now : null,
      },
    });
    await tx.quoteRequest.update({
      where: { id: input.request.id },
      data: { status: nextRequestStatus },
    });
    await tx.quoteRequestEvent.create({
      data: {
        requestId: input.request.id,
        status: nextRequestStatus,
        eventType: input.action === "accept" ? "QUOTE_ACCEPTED" : "QUOTE_REJECTED",
        note: input.comment || null,
      },
    });
    await tx.notification.create({
      data: { requestId: input.request.id, type: input.action === "accept" ? "QUOTE_ACCEPTED" : "QUOTE_REJECTED" },
    });
    if (input.comment) {
      await tx.quoteRequestComment.create({
        data: {
          requestId: input.request.id,
          quoteId: input.quote.id,
          authorType: "CUSTOMER",
          message: input.comment,
        },
      });
    }
  }, {
    maxWait: 5_000,
    timeout: 15_000,
  });

  const quoteNumber = input.quote.quoteNumber || `C-${input.quote.version}`;
  if (input.action === "accept") {
    void sendQuoteAcceptedEmail(input.request.requesterEmail, input.request.requesterName, input.request.requestNumber, quoteNumber);
    void sendInternalQuoteAcceptedNotification(input.request.requesterName, input.request.requesterEmail, input.request.requestNumber, quoteNumber);
  } else {
    void sendQuoteRejectedEmail(input.request.requesterEmail, input.request.requesterName, input.request.requestNumber, quoteNumber, input.comment);
    void sendInternalQuoteRejectedNotification(input.request.requesterName, input.request.requesterEmail, input.request.requestNumber, quoteNumber, input.comment);
  }

  return {
    status: nextRequestStatus,
    quoteStatus: input.action === "accept" ? "ACCEPTED" : "REJECTED",
    canContinueAfterAccept: input.action === "accept",
    canPay: input.action === "accept",
    canAdvanceWithoutPayment: input.action === "accept",
  };
}
