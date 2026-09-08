import crypto from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

import { STORAGE_DIRECTORY_MODE, STORAGE_FILE_MODE } from "@/lib/storage/config";
import { ensureStorageLayout } from "@/lib/storage/local-driver";
import { buildStorageKey, parseStorageKey, resolveStoragePath } from "@/lib/storage/paths";
import type { DocumentStorageType } from "@/lib/storage/types";

export async function saveStoredFile(
  type: DocumentStorageType,
  entityId: string,
  buffer: Buffer,
  extension: string,
): Promise<string> {
  await ensureStorageLayout();

  const storageKey = buildStorageKey({
    type,
    entityId,
    fileId: crypto.randomUUID(),
    extension,
  });
  const { absolutePath } = resolveStoragePath(storageKey);

  await mkdir(path.dirname(absolutePath), { recursive: true, mode: STORAGE_DIRECTORY_MODE });
  await writeFile(absolutePath, buffer, { mode: STORAGE_FILE_MODE });

  if (process.env.NODE_ENV === "production") {
    console.info(`[storage] Archivo guardado: ${storageKey} -> ${absolutePath}`);
  }

  return storageKey;
}

export async function readStoredFile(storageKey: string): Promise<Buffer> {
  const { absolutePath } = resolveStoragePath(storageKey);
  return readFile(absolutePath);
}

export async function replaceStoredFile(
  currentStorageKey: string,
  buffer: Buffer,
  extension: string,
): Promise<string> {
  const { type, entityId } = parseStorageKey(currentStorageKey);
  const nextStorageKey = await saveStoredFile(type, entityId, buffer, extension);
  await deleteStoredFile(currentStorageKey);
  return nextStorageKey;
}

export async function deleteStoredFile(storageKey: string): Promise<void> {
  try {
    const { absolutePath } = resolveStoragePath(storageKey);
    await unlink(absolutePath);
  } catch {
    // Ignorar si el archivo ya no existe o la clave es inválida.
  }
}
