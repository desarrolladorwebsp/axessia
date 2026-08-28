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
  status: "RECEIVED" | "REVIEWING" | "SOURCING" | "QUOTED" | "AWAITING_DECISION" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "COMPLETED";
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
};

const STORAGE_PATH = path.join(process.cwd(), "data", "quote-requests.json");
const QUOTE_STORAGE_PATH = path.join(process.cwd(), "data", "quotes.json");

export type DevQuoteRecord = {
  id: string;
  sequence: number;
  quoteNumber: string;
  customerId: string;
  requestId: string;
  customer: { id: string; name: string; email: string };
  request: { id: string; requestNumber: string | null; requesterName: string; requesterEmail: string };
  version: number;
  status: "DRAFT" | "READY" | "SENT";
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
  const appEnv = process.env.APP_ENV?.toLowerCase() ?? "";
  return appEnv === "development" || appEnv === "developer" || process.env.NODE_ENV === "development";
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
