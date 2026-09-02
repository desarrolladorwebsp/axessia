import { promises as fs } from "fs";
import path from "path";

export type DevQuoteRequestRecord = {
  id: string;
  sequence: number;
  requestNumber: string;
  customerId: string | null;
  requesterName: string;
  requesterPhone: string;
  requesterEmail: string;
  requesterRut: string;
  requesterCity: string;
  patientName: string | null;
  patientRut: string | null;
  status: "RECEIVED" | "SOURCING" | "QUOTED" | "AWAITING_DECISION" | "ACCEPTED" | "SHIPPING" | "REJECTED" | "CANCELLED" | "COMPLETED";
  origin: "WEB" | "EJECUTIVO";
  price?: number | null;
  acceptsPolicies: boolean;
  acceptsDataTreatment: boolean;
  createdAt: string;
  updatedAt: string;
  assignedExecutive?: { id: string; firstName: string; lastName: string } | null;
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string;
    rut: string;
    city: string;
  } | null;
  prescription: {
    id: string;
    requestId: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    storageKey?: string | null;
    createdAt: string;
  } | null;
  clientDocuments?: Array<{
    id: string;
    requestId: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    storageKey?: string | null;
    createdAt: string;
  }>;
  generatedMandate?: {
    id: string;
    requestId: string;
    fileName: string;
    storageKey: string;
    generatedAt: string;
    sentAt: string | null;
  } | null;
  mandateDocuments?: Array<{
    id: string;
    requestId: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    storageKey?: string | null;
    createdAt: string;
  }>;
  medications: Array<{
    id: string;
    requestId: string;
    commercialName: string;
    activeIngredient: string;
    concentration: string;
    tabletQuantity: number;
    createdAt: string;
  }>;
  internalNotes?: Array<{
    id: string;
    executiveName: string;
    message: string;
    createdAt: string;
  }>;
  events?: Array<{
    id: string;
    status: string;
    eventType: string;
    note?: string | null;
    createdAt: string;
  }>;
};

const STORAGE_PATH = path.join(process.cwd(), "data", "quote-requests.json");
const QUOTE_STORAGE_PATH = path.join(process.cwd(), "data", "quotes.json");
const NOTIFICATION_STORAGE_PATH = path.join(process.cwd(), "data", "notifications.json");

export type DevNotificationRecord = {
  id: string;
  requestId: string;
  requestNumber: string;
  requesterName: string;
  isRead: boolean;
  createdAt: string;
};

export type DevQuoteRecord = {
  id: string;
  sequence: number;
  quoteNumber: string;
  customerId: string;
  requestId: string;
  customer: { id: string; name: string; email: string };
  request: { id: string; requestNumber: string | null; requesterName: string; requesterEmail: string };
  version: number;
  status: "DRAFT" | "READY" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "VOIDED";
  total: number | null;
  validUntil: string | null;
  createdAt: string;
  sentAt: string | null;
  items: Array<{
    id: string;
    productName: string;
    activeIngredient: string | null;
    concentration: string | null;
    pharmaceuticalForm: string | null;
    presentation: string | null;
    unitsPerPackage: number | null;
    manufacturer: string | null;
    originCountry: string | null;
    supplierCountry: string | null;
    quantity: number;
    sanitaryRegistry: string | null;
    condition: "AVAILABLE" | "SPECIAL_IMPORT" | null;
    batchNumber: string | null;
    expirationDate: string | null;
    unitPrice: number | null;
    totalPrice: number | null;
  }>;
};

export function shouldUseJsonStorage() {
  // El sistema usa Prisma como fuente de verdad. El almacenamiento en JSON solo se
  // mantiene como compatibilidad histórica, pero no debe activarse para la app actual.
  return false;
}

async function ensureStorageFile() {
  await fs.mkdir(path.dirname(STORAGE_PATH), { recursive: true });

  try {
    await fs.access(STORAGE_PATH);
  } catch {
    await fs.writeFile(STORAGE_PATH, JSON.stringify([], null, 2), "utf-8");
  }
}

export async function readDevQuoteRequests(): Promise<DevQuoteRequestRecord[]> {
  await ensureStorageFile();

  const content = await fs.readFile(STORAGE_PATH, "utf-8");

  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeDevQuoteRequests(records: DevQuoteRequestRecord[]) {
  await ensureStorageFile();
  await fs.writeFile(STORAGE_PATH, JSON.stringify(records, null, 2), "utf-8");
}

export async function readDevQuotes(): Promise<DevQuoteRecord[]> {
  try {
    const content = await fs.readFile(QUOTE_STORAGE_PATH, "utf-8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeDevQuotes(records: DevQuoteRecord[]) {
  await fs.mkdir(path.dirname(QUOTE_STORAGE_PATH), { recursive: true });
  await fs.writeFile(QUOTE_STORAGE_PATH, JSON.stringify(records, null, 2), "utf-8");
}

async function readDevNotifications(): Promise<DevNotificationRecord[]> {
  try {
    const content = await fs.readFile(NOTIFICATION_STORAGE_PATH, "utf-8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeDevNotifications(records: DevNotificationRecord[]) {
  await fs.mkdir(path.dirname(NOTIFICATION_STORAGE_PATH), { recursive: true });
  await fs.writeFile(NOTIFICATION_STORAGE_PATH, JSON.stringify(records, null, 2), "utf-8");
}

export async function createDevRequestNotification(request: Pick<DevQuoteRequestRecord, "id" | "requestNumber" | "requesterName" | "createdAt">) {
  const notifications = await readDevNotifications();
  const existing = notifications.find((notification) => notification.requestId === request.id);
  if (existing) return existing;

  const notification: DevNotificationRecord = {
    id: `notification-${request.id}`,
    requestId: request.id,
    requestNumber: request.requestNumber,
    requesterName: request.requesterName,
    isRead: false,
    createdAt: request.createdAt,
  };
  await writeDevNotifications([notification, ...notifications]);
  return notification;
}

export async function getDevNotifications() {
  const notifications = await readDevNotifications();
  return [...notifications].sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());
}

export async function markDevNotificationAsRead(id: string) {
  const notifications = await readDevNotifications();
  const notification = notifications.find((item) => item.id === id);
  if (!notification) return null;
  if (!notification.isRead) {
    notification.isRead = true;
    await writeDevNotifications(notifications);
  }
  return notification;
}
