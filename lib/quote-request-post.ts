import type { QuoteRequestFormPayload } from "@/lib/quote-request-form-data";

export async function parseQuoteRequestBody(request: Request): Promise<{
  payload: QuoteRequestFormPayload;
  prescriptionFile: File | null;
}> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const payloadRaw = formData.get("payload");

    if (typeof payloadRaw !== "string" || !payloadRaw.trim()) {
      throw new Error("La solicitud está incompleta.");
    }

    const payload = JSON.parse(payloadRaw) as QuoteRequestFormPayload;
    const prescriptionEntry = formData.get("prescription");
    const prescriptionFile = prescriptionEntry instanceof File && prescriptionEntry.size > 0
      ? prescriptionEntry
      : null;

    return { payload, prescriptionFile };
  }

  const payload = (await request.json()) as QuoteRequestFormPayload;
  return { payload, prescriptionFile: null };
}
