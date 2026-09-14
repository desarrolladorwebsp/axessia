import { prisma } from "@/lib/prisma";
import type { ClientDocumentKind } from "@/lib/client-document-type";
import {
  buildSystemDocumentFileName,
  resolveSystemDocumentKind,
} from "@/lib/documents/file-name";
import {
  deleteStoredFile,
  readStoredFile,
  replaceStoredFile,
  saveStoredFile,
} from "@/lib/storage/store-file";
import { validateFileUpload } from "@/lib/documents/validate-upload";
import {
  getStorageTypeForCategory,
  type ManagedDocumentCategory,
  type StoredDocumentRecord,
} from "@/lib/documents/types";
import type { AllowedExtension, AllowedMimeType } from "@/lib/storage/validation";

const documentSelect = {
  id: true,
  requestId: true,
  fileName: true,
  mimeType: true,
  fileSize: true,
  storageKey: true,
  createdAt: true,
} as const;

const clientDocumentSelect = {
  ...documentSelect,
  documentKind: true,
  customLabel: true,
} as const;

export class DocumentServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function findDocumentRecord(
  category: ManagedDocumentCategory,
  documentId: string,
): Promise<StoredDocumentRecord | null> {
  switch (category) {
    case "prescriptions":
      return prisma.prescription.findUnique({ where: { id: documentId }, select: documentSelect });
    case "client-documents":
      return prisma.clientDocument.findUnique({ where: { id: documentId }, select: clientDocumentSelect });
    case "mandate-documents":
      return prisma.mandateDocument.findUnique({ where: { id: documentId }, select: documentSelect });
    default:
      return null;
  }
}

async function updateDocumentRecord(
  category: ManagedDocumentCategory,
  documentId: string,
  data: {
    fileName: string;
    mimeType: string;
    fileSize: number;
    storageKey: string;
  },
): Promise<StoredDocumentRecord> {
  switch (category) {
    case "prescriptions":
      return prisma.prescription.update({ where: { id: documentId }, data, select: documentSelect });
    case "client-documents":
      return prisma.clientDocument.update({ where: { id: documentId }, data, select: clientDocumentSelect });
    case "mandate-documents":
      return prisma.mandateDocument.update({ where: { id: documentId }, data, select: documentSelect });
    default:
      throw new DocumentServiceError("Categoría de documento no soportada.", 400);
  }
}

async function nextDocumentSequence(
  category: ManagedDocumentCategory,
  requestId: string,
  documentKind?: ClientDocumentKind | null,
  excludeDocumentId?: string,
): Promise<number> {
  switch (category) {
    case "prescriptions":
      return prisma.prescription.count({
        where: { requestId, ...(excludeDocumentId ? { id: { not: excludeDocumentId } } : {}) },
      }).then((count) => count + 1);
    case "mandate-documents":
      return prisma.mandateDocument.count({
        where: { requestId, ...(excludeDocumentId ? { id: { not: excludeDocumentId } } : {}) },
      }).then((count) => count + 1);
    case "client-documents":
      return prisma.clientDocument.count({
        where: {
          requestId,
          documentKind: documentKind ?? undefined,
          ...(excludeDocumentId ? { id: { not: excludeDocumentId } } : {}),
        },
      }).then((count) => count + 1);
    default:
      return 1;
  }
}

async function deleteDocumentRecord(
  category: ManagedDocumentCategory,
  documentId: string,
): Promise<void> {
  switch (category) {
    case "prescriptions":
      await prisma.prescription.delete({ where: { id: documentId } });
      return;
    case "client-documents":
      await prisma.clientDocument.delete({ where: { id: documentId } });
      return;
    case "mandate-documents":
      await prisma.mandateDocument.delete({ where: { id: documentId } });
      return;
    default:
      throw new DocumentServiceError("Categoría de documento no soportada.", 400);
  }
}

export function serializeDocumentMeta(
  record: Pick<StoredDocumentRecord, "id" | "fileName" | "mimeType" | "fileSize" | "storageKey" | "createdAt"> & {
    documentKind?: ClientDocumentKind | null;
    customLabel?: string | null;
  },
) {
  return {
    id: record.id,
    fileName: record.fileName,
    mimeType: record.mimeType,
    fileSize: record.fileSize,
    createdAt: record.createdAt.toISOString(),
    hasStoredFile: Boolean(record.storageKey),
    documentKind: record.documentKind ?? null,
    customLabel: record.customLabel ?? null,
  };
}

export async function createStoredDocumentFromBuffer(input: {
  category: ManagedDocumentCategory;
  requestId: string;
  fileName?: string;
  mimeType: AllowedMimeType;
  extension: AllowedExtension;
  buffer: Buffer;
  customerId?: string | null;
  documentKind?: ClientDocumentKind | null;
  customLabel?: string | null;
}): Promise<StoredDocumentRecord> {
  const request = await prisma.quoteRequest.findUnique({
    where: { id: input.requestId },
    select: { id: true, requestNumber: true, customerId: true },
  });
  if (!request) {
    throw new DocumentServiceError("Solicitud no encontrada.", 404);
  }

  const sequence = await nextDocumentSequence(input.category, input.requestId, input.documentKind);
  const fileName = buildSystemDocumentFileName({
    type: resolveSystemDocumentKind(input.category, input.documentKind),
    requestNumber: request.requestNumber,
    productName: input.customLabel,
    extension: input.extension,
    sequence,
  });

  let storageKey: string | null = null;

  try {
    storageKey = await saveStoredFile(
      getStorageTypeForCategory(input.category),
      input.requestId,
      input.buffer,
      input.extension,
    );

    switch (input.category) {
      case "prescriptions":
        return prisma.prescription.create({
          data: {
            requestId: input.requestId,
            customerId: input.customerId ?? request.customerId,
            fileName,
            mimeType: input.mimeType,
            fileSize: input.buffer.length,
            storageKey,
          },
          select: documentSelect,
        });
      case "client-documents":
        return prisma.clientDocument.create({
          data: {
            requestId: input.requestId,
            fileName,
            mimeType: input.mimeType,
            fileSize: input.buffer.length,
            storageKey,
            documentKind: input.documentKind ?? null,
            customLabel: input.customLabel ?? null,
          },
          select: clientDocumentSelect,
        });
      case "mandate-documents":
        return prisma.mandateDocument.create({
          data: {
            requestId: input.requestId,
            fileName,
            mimeType: input.mimeType,
            fileSize: input.buffer.length,
            storageKey,
          },
          select: documentSelect,
        });
      default:
        throw new DocumentServiceError("Categoría de documento no soportada.", 400);
    }
  } catch (error) {
    if (storageKey) await deleteStoredFile(storageKey);
    throw error;
  }
}

export async function createStoredDocument(
  category: ManagedDocumentCategory,
  requestId: string,
  file: File,
  options?: { customerId?: string | null; documentKind?: ClientDocumentKind | null; customLabel?: string | null },
): Promise<StoredDocumentRecord> {
  const validation = await validateFileUpload(file);
  if (!validation.ok) {
    throw new DocumentServiceError(validation.error, 400);
  }

  const { buffer, mimeType, extension } = validation.value;
  return createStoredDocumentFromBuffer({
    category,
    requestId,
    mimeType,
    extension,
    buffer,
    customerId: options?.customerId,
    documentKind: options?.documentKind,
    customLabel: options?.customLabel,
  });
}

export async function getStoredDocumentContent(
  category: ManagedDocumentCategory,
  documentId: string,
): Promise<{ record: StoredDocumentRecord; buffer: Buffer }> {
  const record = await findDocumentRecord(category, documentId);
  if (!record) {
    throw new DocumentServiceError("Documento no encontrado.", 404);
  }
  if (!record.storageKey) {
    throw new DocumentServiceError("El documento no tiene un archivo almacenado.", 404);
  }

  try {
    const buffer = await readStoredFile(record.storageKey);
    return { record, buffer };
  } catch {
    throw new DocumentServiceError("No fue posible leer el archivo almacenado.", 404);
  }
}

export async function replaceStoredDocument(
  category: ManagedDocumentCategory,
  documentId: string,
  file: File,
): Promise<StoredDocumentRecord> {
  const record = await findDocumentRecord(category, documentId);
  if (!record) {
    throw new DocumentServiceError("Documento no encontrado.", 404);
  }

  const validation = await validateFileUpload(file);
  if (!validation.ok) {
    throw new DocumentServiceError(validation.error, 400);
  }

  const { buffer, mimeType, extension } = validation.value;
  const request = await prisma.quoteRequest.findUnique({
    where: { id: record.requestId },
    select: { requestNumber: true },
  });
  const sequence = await nextDocumentSequence(category, record.requestId, record.documentKind, record.id);
  const fileName = buildSystemDocumentFileName({
    type: resolveSystemDocumentKind(category, record.documentKind),
    requestNumber: request?.requestNumber,
    productName: record.customLabel,
    extension,
    sequence,
  });
  let nextStorageKey: string | null = null;

  try {
    nextStorageKey = record.storageKey
      ? await replaceStoredFile(record.storageKey, buffer, extension)
      : await saveStoredFile(getStorageTypeForCategory(category), record.requestId, buffer, extension);

    return await updateDocumentRecord(category, documentId, {
      fileName,
      mimeType,
      fileSize: buffer.length,
      storageKey: nextStorageKey,
    });
  } catch (error) {
    if (nextStorageKey && nextStorageKey !== record.storageKey) {
      await deleteStoredFile(nextStorageKey);
    }
    throw error;
  }
}

export async function deleteStoredDocument(
  category: ManagedDocumentCategory,
  documentId: string,
): Promise<void> {
  const record = await findDocumentRecord(category, documentId);
  if (!record) {
    throw new DocumentServiceError("Documento no encontrado.", 404);
  }

  if (record.storageKey) {
    await deleteStoredFile(record.storageKey);
  }

  await deleteDocumentRecord(category, documentId);
}

export function serializeStoredDocument(record: StoredDocumentRecord) {
  return serializeDocumentMeta(record);
}

export async function getPrescriptionContentForRequestNumber(requestNumber: string) {
  const prescription = await prisma.prescription.findFirst({
    where: { request: { requestNumber } },
    orderBy: { createdAt: "desc" },
    select: documentSelect,
  });

  if (!prescription?.storageKey) {
    throw new DocumentServiceError("Receta no encontrada.", 404);
  }

  try {
    const buffer = await readStoredFile(prescription.storageKey);
    return { record: prescription, buffer };
  } catch {
    throw new DocumentServiceError("No fue posible leer la receta almacenada.", 404);
  }
}
