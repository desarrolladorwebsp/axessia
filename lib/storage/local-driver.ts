import { mkdir } from "fs/promises";

import { getStorageRoot, STORAGE_DIRECTORY_MODE } from "@/lib/storage/config";
import { getStorageTypeDirectory } from "@/lib/storage/paths";
import { DOCUMENT_STORAGE_TYPES } from "@/lib/storage/types";

export async function ensureStorageLayout(): Promise<void> {
  const root = getStorageRoot();
  await mkdir(root, { recursive: true, mode: STORAGE_DIRECTORY_MODE });

  await Promise.all(
    DOCUMENT_STORAGE_TYPES.map((type) =>
      mkdir(getStorageTypeDirectory(type), { recursive: true, mode: STORAGE_DIRECTORY_MODE }),
    ),
  );
}
