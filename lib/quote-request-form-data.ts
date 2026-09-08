export function buildQuoteRequestFormData(
  payload: Record<string, unknown>,
  prescription?: File | null,
): FormData {
  const formData = new FormData();
  formData.append("payload", JSON.stringify(payload));
  if (prescription && prescription.size > 0) {
    formData.append("prescription", prescription);
  }
  return formData;
}

export type QuoteRequestFormPayload = {
  customerId?: string;
  productType?: unknown;
  customer: {
    name: string;
    phone: string;
    email: string;
    rut: string;
    city: string;
  };
  patient?: {
    name?: string;
    rut?: string;
  };
  medications?: Array<{
    commercialName: string;
    activeIngredient: string;
    concentration: string;
    tabletQuantity: number;
  }>;
  medicalDevices?: Array<{
    name: string;
    brand?: string | null;
    model?: string | null;
    quantity?: number | null;
    description?: string | null;
  }>;
  acceptsPolicies: boolean;
  acceptsDataTreatment: boolean;
};
