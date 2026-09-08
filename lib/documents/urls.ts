import type { ManagedDocumentCategory } from "@/lib/documents/types";

export function storedFileApiPath(category: ManagedDocumentCategory, documentId: string) {
  return `/api/files/${category}/${documentId}`;
}

export function trackingPrescriptionApiPath(token: string) {
  return `/api/tracking/prescription?token=${encodeURIComponent(token)}`;
}
