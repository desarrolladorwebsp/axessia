import { getMaxUploadBytes } from "@/lib/storage/config";

export const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;
export const ALLOWED_DOCUMENT_EXTENSIONS = ["pdf"] as const;
export const ALLOWED_EXTENSIONS = [...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_DOCUMENT_EXTENSIONS] as const;

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];
export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

const MIME_TO_EXTENSIONS: Record<AllowedMimeType, readonly AllowedExtension[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "application/pdf": ["pdf"],
};

const FILE_SIGNATURES: Array<{ mimeType: AllowedMimeType; check: (buffer: Buffer) => boolean }> = [
  { mimeType: "image/jpeg", check: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  { mimeType: "image/png", check: (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mimeType: "image/webp", check: (buffer) => buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP" },
  { mimeType: "application/pdf", check: (buffer) => buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-" },
];

export type FileValidationInput = {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  size: number;
};

export type FileValidationResult =
  | { ok: true; mimeType: AllowedMimeType; extension: AllowedExtension }
  | { ok: false; error: string };

function normalizeExtension(extension: string): string {
  return extension.trim().replace(/^\./, "").toLowerCase();
}

function detectMimeType(buffer: Buffer): AllowedMimeType | null {
  for (const signature of FILE_SIGNATURES) {
    if (signature.check(buffer)) return signature.mimeType;
  }
  return null;
}

export function validateUploadFile(input: FileValidationInput): FileValidationResult {
  if (input.size <= 0) return { ok: false, error: "El archivo está vacío." };
  if (input.size > getMaxUploadBytes()) {
    return { ok: false, error: `El archivo supera el máximo permitido (${getMaxUploadBytes()} bytes).` };
  }

  const extension = normalizeExtension(input.extension);
  if (!ALLOWED_EXTENSIONS.includes(extension as AllowedExtension)) {
    return { ok: false, error: "Extensión no permitida." };
  }

  const detectedMimeType = detectMimeType(input.buffer);
  if (!detectedMimeType) return { ok: false, error: "Tipo de archivo no reconocido." };

  const declaredMimeType = input.mimeType.trim().toLowerCase();
  if (declaredMimeType && declaredMimeType !== "application/octet-stream" && declaredMimeType !== detectedMimeType) {
    return { ok: false, error: "El tipo declarado no coincide con el contenido del archivo." };
  }

  const allowedExtensions = MIME_TO_EXTENSIONS[detectedMimeType];
  if (!allowedExtensions.includes(extension as AllowedExtension)) {
    return { ok: false, error: "La extensión no coincide con el tipo de archivo." };
  }

  return { ok: true, mimeType: detectedMimeType, extension: extension as AllowedExtension };
}

export function sanitizeDownloadFileName(fileName: string): string {
  const baseName = pathBasename(fileName).replace(/[^\w.\- ()áéíóúñÁÉÍÓÚÑ]/g, "_").slice(0, 180);
  return baseName || "documento";
}

function pathBasename(value: string): string {
  const normalized = value.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] ?? value;
}
