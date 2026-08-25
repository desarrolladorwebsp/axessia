import { promises as fs } from "fs";
import path from "path";

export type DevQuoteRequestRecord = {
  id: string;
  sequence: number;
  requestNumber: string;
  customerId: string;
  patientName: string | null;
  patientRut: string | null;
  status: "RECEIVED" | "REVIEWING" | "QUOTED" | "APPROVED" | "PROCESSING" | "DELIVERED";
  price: number | null;
  acceptsPolicies: boolean;
  acceptsDataTreatment: boolean;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string;
    rut: string;
    city: string;
  };
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
};

const STORAGE_PATH = path.join(process.cwd(), "data", "quote-requests.json");

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
