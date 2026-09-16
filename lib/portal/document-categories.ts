export const PORTAL_DOCUMENT_CATEGORIES = [
  "prescriptions",
  "client-documents",
  "mandate-documents",
  "generated-mandate",
] as const;

export type PortalDocumentCategory = (typeof PORTAL_DOCUMENT_CATEGORIES)[number];

export function isPortalDocumentCategory(value: string): value is PortalDocumentCategory {
  return (PORTAL_DOCUMENT_CATEGORIES as readonly string[]).includes(value);
}
