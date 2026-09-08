import type { DocumentStorageType } from "@/lib/storage/types";

export const MANAGED_DOCUMENT_CATEGORIES = [
  "prescriptions",
  "client-documents",
  "mandate-documents",
] as const;

export type ManagedDocumentCategory = (typeof MANAGED_DOCUMENT_CATEGORIES)[number];

export type StoredDocumentRecord = {
  id: string;
  requestId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storageKey: string | null;
  createdAt: Date;
};

export function isManagedDocumentCategory(value: string): value is ManagedDocumentCategory {
  return (MANAGED_DOCUMENT_CATEGORIES as readonly string[]).includes(value);
}

export function getStorageTypeForCategory(category: ManagedDocumentCategory): DocumentStorageType {
  return category;
}
