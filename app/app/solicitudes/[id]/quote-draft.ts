import { isMedicalDevice, type ProductType } from "@/lib/product-type";

export type MedicationSeed = {
  commercialName: string;
  activeIngredient: string;
  concentration: string;
  tabletQuantity: number | null;
};

export type DeviceSeed = {
  name: string;
  brand: string | null;
  model: string | null;
  quantity: number | null;
  description: string | null;
};

export type QuoteDraftItem = {
  clientId: string;
  productType: ProductType;
  productName: string;
  activeIngredient: string;
  concentration: string;
  pharmaceuticalForm: string;
  brand: string;
  model: string;
  description: string;
  presentation: string;
  unitsPerPackage: string;
  supplierId: string;
  manufacturer: string;
  originCountry: string;
  supplierCountry: string;
  quantity: string;
  sanitaryRegistry: string;
  condition: "" | "AVAILABLE" | "SPECIAL_IMPORT";
  batchNumber: string;
  expirationDate: string;
  unitPrice: string;
};

export type QuoteSupplierOption = {
  id: string;
  name: string;
  manufacturer: string | null;
  originCountry: string | null;
  country: string | null;
};

export const pharmaceuticalForms = ["Comprimido", "Cápsula", "Ampolla", "Solución", "Jarabe", "Crema", "Otro"];

export const QUOTE_LINE_TYPE_LABELS: Record<ProductType, string> = {
  MEDICATION: "Medicamento",
  MEDICAL_DEVICE: "Equipo médico",
};

export const IVA_RATE = 0.19;

export function newDraftClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyItem(productType: ProductType, seed?: MedicationSeed | DeviceSeed): QuoteDraftItem {
  const deviceSeed = seed && "name" in seed ? seed : null;
  const medicationSeed = seed && "commercialName" in seed ? seed : null;
  return {
    clientId: newDraftClientId(),
    productType,
    productName: deviceSeed?.name ?? medicationSeed?.commercialName ?? "",
    activeIngredient: medicationSeed?.activeIngredient ?? "",
    concentration: medicationSeed?.concentration ?? "",
    pharmaceuticalForm: "",
    brand: deviceSeed?.brand ?? "",
    model: deviceSeed?.model ?? "",
    description: deviceSeed?.description ?? "",
    presentation: "",
    unitsPerPackage: medicationSeed?.tabletQuantity != null ? String(medicationSeed.tabletQuantity) : "",
    supplierId: "",
    manufacturer: "",
    originCountry: "",
    supplierCountry: "",
    quantity: deviceSeed?.quantity != null ? String(deviceSeed.quantity) : "1",
    sanitaryRegistry: "",
    condition: "",
    batchNumber: "",
    expirationDate: "",
    unitPrice: "",
  };
}

export function cloneDraftItem(item: QuoteDraftItem): QuoteDraftItem {
  return { ...item, clientId: newDraftClientId() };
}

export function lineAmount(item: QuoteDraftItem) {
  return (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
}

export function formatClp(value: number) {
  return `$${Math.round(value).toLocaleString("es-CL")}`;
}

export function quoteMoneyBreakdown(items: QuoteDraftItem[]) {
  const subtotal = items.reduce((sum, item) => sum + lineAmount(item), 0);
  const iva = Math.round(subtotal * IVA_RATE);
  return { subtotal, iva, total: subtotal + iva };
}

export function isIncompleteQuoteLine(item: QuoteDraftItem) {
  return !item.productName.trim() || !item.supplierId || item.unitPrice === "" || Number(item.quantity) <= 0;
}

export function itemTypeLabel(item: Pick<QuoteDraftItem, "productType">) {
  return QUOTE_LINE_TYPE_LABELS[item.productType];
}

export function isDeviceItem(item: Pick<QuoteDraftItem, "productType">) {
  return isMedicalDevice(item.productType);
}
