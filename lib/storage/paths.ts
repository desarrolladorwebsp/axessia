import path from "path";

import { getStorageRoot } from "@/lib/storage/config";
import type { DocumentStorageType, ResolvedStoragePath, StorageKeyParts } from "@/lib/storage/types";

const STORAGE_KEY_PATTERN = /^[a-z0-9-]+\/[a-zA-Z0-9_-]+\/[a-f0-9-]+\.[a-z0-9]+$/;

function normalizeSegment(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("..") || trimmed.includes("/") || trimmed.includes("\\")) {
    throw new Error("Segmento de ruta inválido.");
  }
  return trimmed;
}

function normalizeExtension(extension: string): string {
  const normalized = extension.trim().replace(/^\./, "").toLowerCase();
  if (!/^[a-z0-9]+$/.test(normalized)) {
    throw new Error("Extensión inválida.");
  }
  return normalized;
}

export function buildStorageKey(parts: StorageKeyParts): string {
  const type = parts.type;
  const entityId = normalizeSegment(parts.entityId);
  const fileId = normalizeSegment(parts.fileId);
  const extension = normalizeExtension(parts.extension);

  return `${type}/${entityId}/${fileId}.${extension}`;
}

export function isValidStorageKey(storageKey: string): boolean {
  return STORAGE_KEY_PATTERN.test(storageKey);
}

export function parseStorageKey(storageKey: string): StorageKeyParts {
  if (!isValidStorageKey(storageKey)) {
    throw new Error("storageKey inválido.");
  }

  const [type, entityId, filePart] = storageKey.split("/");
  const dotIndex = filePart.lastIndexOf(".");
  if (dotIndex <= 0) {
    throw new Error("storageKey inválido.");
  }

  return {
    type: type as StorageKeyParts["type"],
    entityId,
    fileId: filePart.slice(0, dotIndex),
    extension: filePart.slice(dotIndex + 1),
  };
}

export function resolveStoragePath(storageKey: string): ResolvedStoragePath {
  if (!isValidStorageKey(storageKey)) {
    throw new Error("storageKey inválido.");
  }

  const root = path.resolve(getStorageRoot());
  const absolutePath = path.resolve(root, storageKey);
  const relative = path.relative(root, absolutePath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Ruta de almacenamiento fuera del root permitido.");
  }

  return { storageKey, absolutePath };
}

export function getStorageTypeDirectory(type: DocumentStorageType): string {
  return path.join(getStorageRoot(), type);
}
