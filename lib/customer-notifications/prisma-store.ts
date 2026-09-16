import { Prisma } from "@prisma/client";
import { CLAIM_IN_FLIGHT_MS } from "@/lib/customer-notifications/keys";
import type {
  CompletedRequestCandidate,
  CustomerNotificationStore,
  QuoteReminderCandidate,
  RequestHistoryEventInput,
} from "@/lib/customer-notifications/types";
import { prisma } from "@/lib/prisma";

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function mapQuoteCandidate(quote: {
  id: string;
  quoteNumber: string | null;
  version: number;
  status: string;
  sentAt: Date | null;
  validUntil: Date | null;
  customerId: string;
  customer: { id: string; name: string; email: string };
  request: { id: string; requestNumber: string | null; status: string; requesterName: string; requesterEmail: string };
}): QuoteReminderCandidate {
  return {
    quoteId: quote.id,
    quoteNumber: quote.quoteNumber || `C-${quote.version}`,
    customerId: quote.customer.id,
    customerName: quote.customer.name,
    recipientEmail: quote.customer.email || quote.request.requesterEmail,
    requestId: quote.request.id,
    requestNumber: quote.request.requestNumber || quote.quoteNumber || quote.id,
    requestStatus: quote.request.status,
    status: quote.status,
    sentAt: quote.sentAt,
    validUntil: quote.validUntil,
  };
}

function mapCompletedRequest(request: {
  id: string;
  requestNumber: string | null;
  status: string;
  requesterName: string;
  requesterEmail: string;
  customerId: string | null;
  customer: { id: string; name: string; email: string } | null;
}): CompletedRequestCandidate {
  return {
    requestId: request.id,
    requestNumber: request.requestNumber || request.id,
    requestStatus: request.status,
    customerId: request.customer?.id ?? request.customerId,
    customerName: request.customer?.name || request.requesterName,
    recipientEmail: request.customer?.email || request.requesterEmail,
  };
}

const completedSelect = {
  id: true,
  requestNumber: true,
  status: true,
  requesterName: true,
  requesterEmail: true,
  customerId: true,
  customer: { select: { id: true, name: true, email: true } },
} as const;

export const prismaCustomerNotificationStore: CustomerNotificationStore = {
  async listPendingQuoteReminders(now) {
    const quotes = await prisma.quote.findMany({
      where: {
        status: "SENT",
        sentAt: { not: null },
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        request: { status: "AWAITING_DECISION" },
      },
      select: {
        id: true,
        quoteNumber: true,
        version: true,
        status: true,
        sentAt: true,
        validUntil: true,
        customerId: true,
        customer: { select: { id: true, name: true, email: true } },
        request: { select: { id: true, requestNumber: true, status: true, requesterName: true, requesterEmail: true } },
      },
    });

    return quotes.map(mapQuoteCandidate);
  },

  async listCompletedRequestsNeedingNotice() {
    const requests = await prisma.quoteRequest.findMany({
      where: {
        status: "COMPLETED",
        customerEmailNotifications: {
          none: {
            type: "REQUEST_COMPLETED",
            status: "SENT",
          },
        },
      },
      select: completedSelect,
    });

    return requests.map(mapCompletedRequest);
  },

  async getCompletedRequest(requestId) {
    const request = await prisma.quoteRequest.findUnique({
      where: { id: requestId },
      select: completedSelect,
    });
    if (!request || request.status !== "COMPLETED") return null;
    return mapCompletedRequest(request);
  },

  async claimOccurrence(input) {
    const desiredStatus = input.status ?? "PENDING";

    try {
      await prisma.customerEmailNotification.create({
        data: {
          occurrenceKey: input.occurrenceKey,
          type: input.type,
          status: desiredStatus,
          customerId: input.customerId,
          quoteId: input.quoteId,
          requestId: input.requestId,
          recipientEmail: input.recipientEmail,
        },
      });
      return "claimed";
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
    }

    const existing = await prisma.customerEmailNotification.findUnique({
      where: { occurrenceKey: input.occurrenceKey },
      select: { status: true, createdAt: true, updatedAt: true },
    });

    if (!existing) return "already-done";
    if (existing.status === "SENT" || existing.status === "SKIPPED") return "already-done";
    if (desiredStatus === "SKIPPED") return "already-done";

    const reference = existing.updatedAt ?? existing.createdAt;
    if (existing.status === "PENDING" && input.now.getTime() - reference.getTime() < CLAIM_IN_FLIGHT_MS) {
      return "in-flight";
    }

    await prisma.customerEmailNotification.update({
      where: { occurrenceKey: input.occurrenceKey },
      data: {
        status: "PENDING",
        errorMessage: null,
        type: input.type,
        customerId: input.customerId,
        quoteId: input.quoteId,
        requestId: input.requestId,
        recipientEmail: input.recipientEmail,
      },
    });
    return "claimed";
  },

  async markSent(occurrenceKey, providerMessageId, sentAt) {
    await prisma.customerEmailNotification.update({
      where: { occurrenceKey },
      data: {
        status: "SENT",
        providerMessageId,
        sentAt,
        errorMessage: null,
      },
    });
  },

  async markFailed(occurrenceKey, errorMessage) {
    await prisma.customerEmailNotification.update({
      where: { occurrenceKey },
      data: {
        status: "FAILED",
        sentAt: null,
        providerMessageId: null,
        errorMessage: errorMessage.slice(0, 2000),
      },
    });
  },

  async appendRequestEvent(input: RequestHistoryEventInput) {
    await prisma.quoteRequestEvent.create({
      data: {
        requestId: input.requestId,
        status: input.status,
        eventType: input.eventType,
        note: input.note,
      },
    });
  },
};
