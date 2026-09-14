export const PRODUCT_TYPES = ["MEDICATION", "MEDICAL_DEVICE"] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  MEDICATION: "Medicamento",
  MEDICAL_DEVICE: "Dispositivo médico",
};

export const PRODUCT_TYPE_PLURAL_LABELS: Record<ProductType, string> = {
  MEDICATION: "Medicamentos",
  MEDICAL_DEVICE: "Dispositivos médicos",
};

export function isProductType(value: unknown): value is ProductType {
  return value === "MEDICATION" || value === "MEDICAL_DEVICE";
}

export function parseProductType(value: unknown): ProductType {
  if (isProductType(value)) return value;
  throw new Error("Indica si necesitas un medicamento o un dispositivo médico");
}

export function productTypeLabel(value: string | null | undefined): string {
  return isProductType(value) ? PRODUCT_TYPE_LABELS[value] : PRODUCT_TYPE_LABELS.MEDICATION;
}

export function productTypePluralLabel(value: string | null | undefined): string {
  return isProductType(value) ? PRODUCT_TYPE_PLURAL_LABELS[value] : PRODUCT_TYPE_PLURAL_LABELS.MEDICATION;
}

export function isMedicalDevice(value: string | null | undefined): boolean {
  return value === "MEDICAL_DEVICE";
}

export function quoteConditionLabel(
  condition: "AVAILABLE" | "SPECIAL_IMPORT" | string | null | undefined,
  productType?: string | null,
) {
  if (condition === "SPECIAL_IMPORT") return "Importación especial";
  if (condition === "AVAILABLE") {
    return isMedicalDevice(productType) ? "Dispositivo disponible" : "Medicamento disponible";
  }
  return null;
}

export type MedicationInput = {
  commercialName: string;
  activeIngredient: string;
  concentration: string;
  tabletQuantity: number | null;
  notes: string | null;
};

export type MedicalDeviceInput = {
  name: string;
  brand: string | null;
  model: string | null;
  quantity: number | null;
  description: string | null;
};

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requiredText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseOptionalPositiveInt(value: unknown): number | null | "invalid" {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  const quantity = Number.isFinite(parsed) ? Math.trunc(parsed) : NaN;
  if (!Number.isInteger(quantity) || quantity <= 0) return "invalid";
  return quantity;
}

export function parseMedicationItems(rawItems: unknown): MedicationInput[] {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error("Agrega al menos un medicamento");
  }

  return rawItems.map((item, index) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const commercialName = requiredText(row.commercialName);
    const activeIngredient = requiredText(row.activeIngredient);
    const concentration = requiredText(row.concentration);
    const tabletQuantity = parseOptionalPositiveInt(row.tabletQuantity);
    if (!commercialName || !activeIngredient || !concentration || tabletQuantity === "invalid") {
      throw new Error(`Medicamento ${index + 1} incompleto`);
    }
    const notes = optionalText(row.notes)?.slice(0, 500) ?? null;
    return { commercialName, activeIngredient, concentration, tabletQuantity, notes };
  });
}

export function parseMedicalDeviceItems(rawItems: unknown): MedicalDeviceInput[] {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error("Agrega al menos un dispositivo médico");
  }

  return rawItems.map((item, index) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const name = requiredText(row.name);
    if (!name) throw new Error(`Dispositivo ${index + 1} incompleto`);
    const quantityRaw = row.quantity === undefined || row.quantity === null || row.quantity === "" ? null : Number(row.quantity);
    const quantity = quantityRaw === null ? null : Math.trunc(quantityRaw);
    if (quantity !== null && (!Number.isInteger(quantity) || quantity <= 0)) {
      throw new Error(`Dispositivo ${index + 1} incompleto`);
    }
    return {
      name,
      brand: optionalText(row.brand),
      model: optionalText(row.model),
      quantity,
      description: optionalText(row.description),
    };
  });
}

export function requestProductCount(request: {
  productType?: string | null;
  medications?: unknown[];
  medicalDevices?: unknown[];
}) {
  return isMedicalDevice(request.productType) ? (request.medicalDevices?.length ?? 0) : (request.medications?.length ?? 0);
}

export function requestPrimaryProductName(request: {
  productType?: string | null;
  medications?: Array<{ commercialName?: string | null }>;
  medicalDevices?: Array<{ name?: string | null }>;
}) {
  if (isMedicalDevice(request.productType)) {
    return request.medicalDevices?.[0]?.name?.trim() || "Sin dispositivo";
  }
  return request.medications?.[0]?.commercialName?.trim() || "Sin medicamento";
}

export function mandateProductsFromRequest(request: {
  productType?: string | null;
  medications?: Array<{ commercialName: string; activeIngredient?: string | null }>;
  medicalDevices?: Array<{ name: string; brand?: string | null; model?: string | null }>;
}) {
  if (isMedicalDevice(request.productType)) {
    return {
      productLabel: "dispositivo médico",
      products: (request.medicalDevices ?? []).map((item) => ({
        name: item.name,
        detail: [item.brand, item.model].filter(Boolean).join(" ") || null,
      })),
    };
  }
  return {
    productLabel: "medicamento",
    products: (request.medications ?? []).map((item) => ({
      name: item.commercialName,
      detail: item.activeIngredient || null,
    })),
  };
}
