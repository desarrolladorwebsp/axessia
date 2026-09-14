export const CLIENT_DOCUMENT_KINDS = ["MANDATE", "ID_FRONT", "ID_BACK", "OTHER"] as const;

export type ClientDocumentKind = (typeof CLIENT_DOCUMENT_KINDS)[number];

export const CLIENT_DOCUMENT_KIND_LABELS: Record<ClientDocumentKind, string> = {
  MANDATE: "Poder / mandato",
  ID_FRONT: "Cédula de identidad - parte delantera",
  ID_BACK: "Cédula de identidad - parte trasera",
  OTHER: "Otros",
};

const MAX_CUSTOM_LABEL_LENGTH = 80;

export function isClientDocumentKind(value: string): value is ClientDocumentKind {
  return (CLIENT_DOCUMENT_KINDS as readonly string[]).includes(value);
}

export function parseClientDocumentKind(value: FormDataEntryValue | null): ClientDocumentKind | null {
  if (typeof value !== "string") return null;
  const kind = value.trim().toUpperCase();
  return isClientDocumentKind(kind) ? kind : null;
}

export function parseClientDocumentCustomLabel(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_CUSTOM_LABEL_LENGTH);
}

export function resolveClientDocumentLabel(input: {
  documentKind?: ClientDocumentKind | string | null;
  customLabel?: string | null;
  fileName: string;
}): string {
  if (input.documentKind === "OTHER") {
    const customLabel = input.customLabel?.trim();
    return customLabel || CLIENT_DOCUMENT_KIND_LABELS.OTHER;
  }
  if (input.documentKind && isClientDocumentKind(input.documentKind)) {
    return CLIENT_DOCUMENT_KIND_LABELS[input.documentKind];
  }
  return input.fileName;
}

export function validateClientDocumentClassification(input: {
  documentKind: ClientDocumentKind | null;
  customLabel: string;
}): { ok: true; documentKind: ClientDocumentKind; customLabel: string | null } | { ok: false; error: string } {
  if (!input.documentKind) {
    return { ok: false, error: "Selecciona el tipo de documento." };
  }
  if (input.documentKind !== "OTHER") {
    return { ok: true, documentKind: input.documentKind, customLabel: null };
  }
  if (input.customLabel.length < 2) {
    return { ok: false, error: "Indica el nombre o tipo del documento." };
  }
  return { ok: true, documentKind: input.documentKind, customLabel: input.customLabel };
}
