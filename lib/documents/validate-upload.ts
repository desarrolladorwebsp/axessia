import {
  validateUploadFile,
  type AllowedExtension,
  type AllowedMimeType,
} from "@/lib/storage/validation";

export type ValidatedFileUpload = {
  buffer: Buffer;
  fileName: string;
  mimeType: AllowedMimeType;
  extension: AllowedExtension;
};

export async function validateFileUpload(file: File): Promise<
  | { ok: true; value: ValidatedFileUpload }
  | { ok: false; error: string }
> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.name.split(".").pop() ?? "";
  const validation = validateUploadFile({
    buffer,
    mimeType: file.type,
    extension,
    size: buffer.length,
  });

  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  return {
    ok: true,
    value: {
      buffer,
      fileName: file.name,
      mimeType: validation.mimeType,
      extension: validation.extension,
    },
  };
}
