import { createStoredDocumentFromBuffer } from "@/lib/documents/file-service";
import { validateFileUpload, type ValidatedFileUpload } from "@/lib/documents/validate-upload";
import type { AllowedExtension, AllowedMimeType } from "@/lib/storage/validation";

export type ValidatedPrescriptionUpload = ValidatedFileUpload;

export async function validatePrescriptionUpload(file: File): Promise<
  | { ok: true; value: ValidatedPrescriptionUpload }
  | { ok: false; error: string }
> {
  return validateFileUpload(file);
}

export async function savePrescriptionForRequest(input: {
  requestId: string;
  customerId: string | null;
  fileName: string;
  buffer: Buffer;
  mimeType: AllowedMimeType;
  extension: AllowedExtension;
}) {
  return createStoredDocumentFromBuffer({
    category: "prescriptions",
    requestId: input.requestId,
    customerId: input.customerId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    extension: input.extension,
    buffer: input.buffer,
  });
}
