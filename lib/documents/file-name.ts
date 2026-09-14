import type { ClientDocumentKind } from "@/lib/client-document-type";
import type { ManagedDocumentCategory } from "@/lib/documents/types";

export type SystemDocumentKind =
  | "prescription"
  | "mandate"
  | "mandate-signed"
  | "id-front"
  | "id-back"
  | "related";

const TYPE_PREFIX: Record<SystemDocumentKind, string> = {
  prescription: "Receta",
  mandate: "Mandato",
  "mandate-signed": "Mandato-firmado",
  "id-front": "Cedula-frontal",
  "id-back": "Cedula-trasera",
  related: "Documento",
};

export function slugifyDocumentSegment(value: string, fallback = "Documento"): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || fallback;
}

export function resolveSystemDocumentKind(
  category: ManagedDocumentCategory,
  documentKind?: ClientDocumentKind | string | null,
): SystemDocumentKind {
  if (category === "prescriptions") return "prescription";
  if (category === "mandate-documents") return "mandate-signed";
  if (documentKind === "MANDATE") return "mandate-signed";
  if (documentKind === "ID_FRONT") return "id-front";
  if (documentKind === "ID_BACK") return "id-back";
  return "related";
}

export function buildSystemDocumentFileName(input: {
  type: SystemDocumentKind;
  requestNumber?: string | null;
  productName?: string | null;
  extension: string;
  sequence?: number;
}): string {
  const extension = input.extension.trim().replace(/^\./, "").toLowerCase() || "bin";
  const requestPart = slugifyDocumentSegment(input.requestNumber ?? "", "sin-numero");
  const prefix = input.type === "related" && input.productName?.trim()
    ? slugifyDocumentSegment(input.productName, TYPE_PREFIX.related)
    : TYPE_PREFIX[input.type];
  const sequence = input.sequence && input.sequence > 1 ? `-${input.sequence}` : "";
  return `${prefix}-AXESSIA-${requestPart}${sequence}.${extension}`;
}
