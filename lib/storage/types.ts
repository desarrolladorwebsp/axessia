export const DOCUMENT_STORAGE_TYPES = [
  "prescriptions",
  "client-documents",
  "mandate-documents",
  "generated-mandates",
  "avatars",
  "chat-images",
] as const;

export type DocumentStorageType = (typeof DOCUMENT_STORAGE_TYPES)[number];

export type StorageKeyParts = {
  type: DocumentStorageType;
  entityId: string;
  fileId: string;
  extension: string;
};

export type ResolvedStoragePath = {
  absolutePath: string;
  storageKey: string;
};
