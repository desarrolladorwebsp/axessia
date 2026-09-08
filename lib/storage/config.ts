import path from "path";

const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const PRODUCTION_STORAGE_ROOT = "/home/axessia/storage/axessia";

export function getStorageRoot(): string {
  const configured = process.env.AXESSIA_STORAGE_ROOT?.trim();
  if (configured) return path.resolve(configured);

  if (process.env.NODE_ENV === "production") {
    return path.resolve(PRODUCTION_STORAGE_ROOT);
  }

  return path.join(process.cwd(), "storage", "axessia");
}

export function getMaxUploadBytes(): number {
  const configured = Number.parseInt(process.env.AXESSIA_MAX_UPLOAD_BYTES ?? "", 10);
  if (Number.isFinite(configured) && configured > 0) return configured;
  return DEFAULT_MAX_UPLOAD_BYTES;
}

export const STORAGE_DIRECTORY_MODE = 0o750;
export const STORAGE_FILE_MODE = 0o640;
