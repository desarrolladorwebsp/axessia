import { prisma } from "@/lib/prisma";
import {
  activeClientAlertFromRows,
  formatAlertPersonName,
  loadActiveClientAlertFromReader,
  loadDashboardInternalAlertsFromReader,
  toAlertAmount,
  type ActiveClientAlert,
  type AlertPage,
  type ExpiringQuoteAlert,
  type InternalAlertsReader,
  type StalledRequestAlert,
} from "@/lib/internal-alerts/load";
import {
  ASSIGNMENT_EVENT_TYPE,
  assignedWithoutQuoteBefore,
  CLOSED_REQUEST_STATUSES,
  expiringQuoteRange,
  INTERNAL_ALERT_PREVIEW_LIMIT,
  OPEN_QUOTE_STATUSES,
  unassignedStaleBefore,
} from "@/lib/internal-alerts/rules";

const requestIdentity = {
  id: true,
  requestNumber: true,
  createdAt: true,
  assignedExecutive: { select: { firstName: true, lastName: true } },
} as const;

async function readExpiringQuotes(now: Date): Promise<AlertPage<ExpiringQuoteAlert>> {
  const range = expiringQuoteRange(now);
  const where = {
    status: { in: [...OPEN_QUOTE_STATUSES] },
    validUntil: { gt: range.after, lt: range.before },
  };

  const [total, rows] = await Promise.all([
    prisma.quote.count({ where }),
    prisma.quote.findMany({
      where,
      select: {
        id: true,
        quoteNumber: true,
        total: true,
        createdAt: true,
        request: {
          select: {
            id: true,
            requestNumber: true,
            assignedExecutive: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { validUntil: "asc" },
      take: INTERNAL_ALERT_PREVIEW_LIMIT,
    }),
  ]);

  return {
    total,
    items: rows.map((row) => ({
      quoteId: row.id,
      requestId: row.request.id,
      requestNumber: row.request.requestNumber,
      quoteNumber: row.quoteNumber,
      amount: toAlertAmount(row.total),
      createdAt: row.createdAt.toISOString(),
      responsibleName: formatAlertPersonName(row.request.assignedExecutive, "Sin responsable"),
    })),
  };
}

async function readUnassignedStale(now: Date): Promise<AlertPage<StalledRequestAlert>> {
  const where = {
    assignedExecutiveId: null,
    createdAt: { lt: unassignedStaleBefore(now) },
    status: { notIn: [...CLOSED_REQUEST_STATUSES] },
  };

  const [total, rows] = await Promise.all([
    prisma.quoteRequest.count({ where }),
    prisma.quoteRequest.findMany({
      where,
      select: requestIdentity,
      orderBy: { createdAt: "asc" },
      take: INTERNAL_ALERT_PREVIEW_LIMIT,
    }),
  ]);

  return {
    total,
    items: rows.map((row) => ({
      requestId: row.id,
      requestNumber: row.requestNumber,
      reason: "UNASSIGNED" as const,
      createdAt: row.createdAt.toISOString(),
      responsibleName: "Sin asignar",
    })),
  };
}

async function readAssignedWithoutQuote(now: Date): Promise<AlertPage<StalledRequestAlert>> {
  const where = {
    assignedExecutiveId: { not: null },
    status: { notIn: [...CLOSED_REQUEST_STATUSES] },
    quotes: { none: {} },
    events: {
      some: {
        eventType: ASSIGNMENT_EVENT_TYPE,
        createdAt: { lte: assignedWithoutQuoteBefore(now) },
      },
    },
  };

  const [total, rows] = await Promise.all([
    prisma.quoteRequest.count({ where }),
    prisma.quoteRequest.findMany({
      where,
      select: requestIdentity,
      orderBy: { createdAt: "asc" },
      take: INTERNAL_ALERT_PREVIEW_LIMIT,
    }),
  ]);

  return {
    total,
    items: rows.map((row) => ({
      requestId: row.id,
      requestNumber: row.requestNumber,
      reason: "ASSIGNED_WITHOUT_QUOTE" as const,
      createdAt: row.createdAt.toISOString(),
      responsibleName: formatAlertPersonName(row.assignedExecutive, "Sin responsable"),
    })),
  };
}

const prismaReader: InternalAlertsReader = {
  readExpiringQuotes,
  readUnassignedStale,
  readAssignedWithoutQuote,
};

export function loadDashboardInternalAlerts(now = new Date()) {
  return loadDashboardInternalAlertsFromReader(prismaReader, now);
}

export function loadActiveClientAlert(requestId: string): Promise<ActiveClientAlert> {
  return loadActiveClientAlertFromReader(async () => {
    const current = await prisma.quoteRequest.findUnique({
      where: { id: requestId },
      select: {
        requesterRut: true,
        customer: { select: { rut: true } },
      },
    });
    if (!current) return { visible: false, activeCount: 0 };

    const activeRows = await prisma.quoteRequest.findMany({
      where: { status: { notIn: [...CLOSED_REQUEST_STATUSES] } },
      select: {
        requesterRut: true,
        customer: { select: { rut: true } },
      },
    });

    return activeClientAlertFromRows(
      { customerRut: current.customer?.rut, requesterRut: current.requesterRut },
      activeRows.map((row) => ({ customerRut: row.customer?.rut, requesterRut: row.requesterRut })),
    );
  });
}
