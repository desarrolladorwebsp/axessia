import {
  ACTIVE_CLIENT_ALERT_MIN_COUNT,
  clientAlertRut,
  countActiveRequestsForRut,
  INTERNAL_ALERT_PREVIEW_LIMIT,
  shouldShowActiveClientAlert,
  type ActiveClientRutRow,
  type StalledRequestReason,
} from "@/lib/internal-alerts/rules";

export type ExpiringQuoteAlert = {
  quoteId: string;
  requestId: string;
  requestNumber: string | null;
  quoteNumber: string | null;
  amount: number | null;
  createdAt: string;
  responsibleName: string;
};

export type StalledRequestAlert = {
  requestId: string;
  requestNumber: string | null;
  reason: StalledRequestReason;
  createdAt: string;
  responsibleName: string;
};

export type AlertCollection<T> = {
  available: boolean;
  partial: boolean;
  total: number;
  items: T[];
};

export type DashboardInternalAlerts = {
  expiringQuotes: AlertCollection<ExpiringQuoteAlert>;
  stalledRequests: AlertCollection<StalledRequestAlert>;
};

export type ActiveClientAlert = {
  visible: boolean;
  activeCount: number;
};

export type AlertPage<T> = {
  total: number;
  items: T[];
};

export type InternalAlertsReader = {
  readExpiringQuotes: (now: Date) => Promise<AlertPage<ExpiringQuoteAlert>>;
  readUnassignedStale: (now: Date) => Promise<AlertPage<StalledRequestAlert>>;
  readAssignedWithoutQuote: (now: Date) => Promise<AlertPage<StalledRequestAlert>>;
};

const UNAVAILABLE_ACTIVE_CLIENT: ActiveClientAlert = { visible: false, activeCount: 0 };

export function unavailableCollection<T>(): AlertCollection<T> {
  return { available: false, partial: false, total: 0, items: [] };
}

export function unavailableDashboardAlerts(): DashboardInternalAlerts {
  return {
    expiringQuotes: unavailableCollection(),
    stalledRequests: unavailableCollection(),
  };
}

export function toAlertAmount(value: { toString(): string } | number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatAlertPersonName(
  person: { firstName?: string | null; lastName?: string | null } | null | undefined,
  emptyLabel: string,
): string {
  const name = `${person?.firstName ?? ""} ${person?.lastName ?? ""}`.replace(/\s+/g, " ").trim();
  return name || emptyLabel;
}

export async function guardAlert<T>(label: string, fallback: T, read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    console.error(`Alerta interna no disponible (${label}):`, error);
    return fallback;
  }
}

export function mergeStalledAlerts(
  unassigned: AlertCollection<StalledRequestAlert>,
  withoutQuote: AlertCollection<StalledRequestAlert>,
): AlertCollection<StalledRequestAlert> {
  if (!unassigned.available && !withoutQuote.available) return unavailableCollection();

  const items = [
    ...(unassigned.available ? unassigned.items : []),
    ...(withoutQuote.available ? withoutQuote.items : []),
  ]
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
    .slice(0, INTERNAL_ALERT_PREVIEW_LIMIT);

  return {
    available: true,
    partial: !unassigned.available || !withoutQuote.available,
    total: (unassigned.available ? unassigned.total : 0) + (withoutQuote.available ? withoutQuote.total : 0),
    items,
  };
}

async function readSlice<T>(label: string, read: () => Promise<AlertPage<T>>): Promise<AlertCollection<T>> {
  return guardAlert(label, unavailableCollection<T>(), async () => {
    const page = await read();
    return {
      available: true,
      partial: false,
      total: page.total,
      items: page.items.slice(0, INTERNAL_ALERT_PREVIEW_LIMIT),
    };
  });
}

export async function loadDashboardInternalAlertsFromReader(
  reader: InternalAlertsReader,
  now = new Date(),
): Promise<DashboardInternalAlerts> {
  const [expiringQuotes, unassigned, withoutQuote] = await Promise.all([
    readSlice("cotizaciones por vencer", () => reader.readExpiringQuotes(now)),
    readSlice("solicitudes sin asignar", () => reader.readUnassignedStale(now)),
    readSlice("solicitudes asignadas sin cotización", () => reader.readAssignedWithoutQuote(now)),
  ]);

  return {
    expiringQuotes,
    stalledRequests: mergeStalledAlerts(unassigned, withoutQuote),
  };
}

export function activeClientAlertFromRows(current: ActiveClientRutRow | null, rows: ActiveClientRutRow[]): ActiveClientAlert {
  const rut = clientAlertRut(current?.customerRut, current?.requesterRut);
  const activeCount = countActiveRequestsForRut(rut, rows);
  return {
    visible: shouldShowActiveClientAlert(activeCount),
    activeCount,
  };
}

export async function loadActiveClientAlertFromReader(
  read: () => Promise<ActiveClientAlert>,
): Promise<ActiveClientAlert> {
  const alert = await guardAlert("cliente con solicitudes activas", UNAVAILABLE_ACTIVE_CLIENT, read);
  if (!alert.visible || alert.activeCount < ACTIVE_CLIENT_ALERT_MIN_COUNT) {
    return { visible: false, activeCount: Math.max(0, alert.activeCount) || 0 };
  }
  return alert;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function parseCollection<T>(value: unknown, parseItem: (item: unknown) => T | null): AlertCollection<T> {
  if (!isRecord(value) || typeof value.available !== "boolean" || typeof value.total !== "number" || !Array.isArray(value.items)) {
    return unavailableCollection();
  }
  const items = value.items.flatMap((item) => {
    const parsed = parseItem(item);
    return parsed ? [parsed] : [];
  });
  return {
    available: value.available,
    partial: value.partial === true,
    total: Number.isFinite(value.total) ? value.total : items.length,
    items,
  };
}

function parseExpiringQuote(value: unknown): ExpiringQuoteAlert | null {
  if (!isRecord(value) || typeof value.quoteId !== "string" || typeof value.requestId !== "string") return null;
  return {
    quoteId: value.quoteId,
    requestId: value.requestId,
    requestNumber: typeof value.requestNumber === "string" ? value.requestNumber : null,
    quoteNumber: typeof value.quoteNumber === "string" ? value.quoteNumber : null,
    amount: typeof value.amount === "number" && Number.isFinite(value.amount) ? value.amount : null,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
    responsibleName: typeof value.responsibleName === "string" ? value.responsibleName : "Sin responsable",
  };
}

function parseStalledRequest(value: unknown): StalledRequestAlert | null {
  if (!isRecord(value) || typeof value.requestId !== "string") return null;
  if (value.reason !== "UNASSIGNED" && value.reason !== "ASSIGNED_WITHOUT_QUOTE") return null;
  return {
    requestId: value.requestId,
    requestNumber: typeof value.requestNumber === "string" ? value.requestNumber : null,
    reason: value.reason,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
    responsibleName: typeof value.responsibleName === "string" ? value.responsibleName : "Sin asignar",
  };
}

export function parseDashboardAlerts(value: unknown): DashboardInternalAlerts {
  if (!isRecord(value)) return unavailableDashboardAlerts();
  return {
    expiringQuotes: parseCollection(value.expiringQuotes, parseExpiringQuote),
    stalledRequests: parseCollection(value.stalledRequests, parseStalledRequest),
  };
}

export function parseActiveClientAlert(value: unknown): ActiveClientAlert {
  if (!isRecord(value)) return UNAVAILABLE_ACTIVE_CLIENT;
  const activeCount = typeof value.activeCount === "number" && Number.isFinite(value.activeCount) ? value.activeCount : 0;
  return {
    visible: value.visible === true && shouldShowActiveClientAlert(activeCount),
    activeCount,
  };
}
