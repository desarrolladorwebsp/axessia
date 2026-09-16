import { isMedicalDevice, isProductType, type ProductType } from "@/lib/product-type";

const quoteItemConditions = ["AVAILABLE", "SPECIAL_IMPORT"] as const;

export type QuoteItemPayload = {
  productType?: unknown;
  productName?: unknown;
  activeIngredient?: unknown;
  concentration?: unknown;
  pharmaceuticalForm?: unknown;
  brand?: unknown;
  model?: unknown;
  description?: unknown;
  presentation?: unknown;
  unitsPerPackage?: unknown;
  manufacturer?: unknown;
  originCountry?: unknown;
  supplierCountry?: unknown;
  supplierId?: unknown;
  quantity?: unknown;
  sanitaryRegistry?: unknown;
  condition?: unknown;
  batchNumber?: unknown;
  expirationDate?: unknown;
  unitPrice?: unknown;
};

export type ParsedQuoteItem = {
  productType: ProductType;
  productName: string;
  activeIngredient: string | null;
  concentration: string | null;
  pharmaceuticalForm: string | null;
  brand: string | null;
  model: string | null;
  description: string | null;
  presentation: string | null;
  unitsPerPackage: number | null;
  manufacturer: string | null;
  originCountry: string | null;
  supplierCountry: string | null;
  supplierId: string | null;
  quantity: number;
  sanitaryRegistry: string | null;
  condition: "AVAILABLE" | "SPECIAL_IMPORT" | null;
  batchNumber: string | null;
  expirationDate: Date | null;
  unitPrice: number | null;
  totalPrice: number | null;
};

/**
 * Parses and validates quote items. Drafts only require a product name; finalized
 * quotes also require a positive integer quantity and a non-negative unit price.
 */
export function parseQuoteItems(rawItems: QuoteItemPayload[], asDraft: boolean, fallbackProductType: ProductType = "MEDICATION"): ParsedQuoteItem[] {
  return rawItems.map((item, index) => {
    const productType = isProductType(item.productType) ? item.productType : fallbackProductType;
    const device = isMedicalDevice(productType);
    const productName = typeof item.productName === "string" ? item.productName.trim() : "";
    const brand = typeof item.brand === "string" && item.brand.trim() ? item.brand.trim() : null;
    const model = typeof item.model === "string" && item.model.trim() ? item.model.trim() : null;
    const description = typeof item.description === "string" && item.description.trim() ? item.description.trim() : null;
    const activeIngredient = !device && typeof item.activeIngredient === "string" ? item.activeIngredient.trim() || null : null;
    const concentration = !device && typeof item.concentration === "string" ? item.concentration.trim() || null : null;
    const pharmaceuticalForm = !device && typeof item.pharmaceuticalForm === "string" && item.pharmaceuticalForm.trim() ? item.pharmaceuticalForm.trim() : null;
    const presentation = typeof item.presentation === "string" && item.presentation.trim() ? item.presentation.trim() : null;
    const manufacturer = typeof item.manufacturer === "string" && item.manufacturer.trim() ? item.manufacturer.trim() : null;
    const originCountry = typeof item.originCountry === "string" && item.originCountry.trim() ? item.originCountry.trim() : null;
    const supplierCountry = typeof item.supplierCountry === "string" && item.supplierCountry.trim() ? item.supplierCountry.trim() : null;
    const supplierId = typeof item.supplierId === "string" && item.supplierId.trim() ? item.supplierId.trim() : null;
    const sanitaryRegistry = typeof item.sanitaryRegistry === "string" && item.sanitaryRegistry.trim() ? item.sanitaryRegistry.trim() : null;
    const batchNumber = typeof item.batchNumber === "string" && item.batchNumber.trim() ? item.batchNumber.trim() : null;
    const condition = quoteItemConditions.includes(item.condition as (typeof quoteItemConditions)[number]) ? (item.condition as (typeof quoteItemConditions)[number]) : null;
    const expirationDate = typeof item.expirationDate === "string" && item.expirationDate.trim() ? new Date(item.expirationDate) : null;
    if (expirationDate && Number.isNaN(expirationDate.getTime())) throw new Error(`Producto ${index + 1} inválido`);
    if (!productName) throw new Error(`Producto ${index + 1} inválido`);
    // cantidad de unidades solicitadas (ej. cajas), distinta de las unidades contenidas por presentación
    const quantityRaw = item.quantity === undefined || item.quantity === null || item.quantity === "" ? 0 : Number(item.quantity);
    const quantity = Number.isFinite(quantityRaw) ? Math.trunc(quantityRaw) : 0;
    const unitsPerPackage = device || item.unitsPerPackage === undefined || item.unitsPerPackage === null || item.unitsPerPackage === "" ? null : Number(item.unitsPerPackage);
    const unitPriceRaw = item.unitPrice === undefined || item.unitPrice === null || item.unitPrice === "" ? null : Number(item.unitPrice);
    const unitPrice = unitPriceRaw !== null && Number.isFinite(unitPriceRaw) ? unitPriceRaw : null;
    if (!asDraft && (!Number.isInteger(quantity) || quantity <= 0 || unitPrice === null || unitPrice < 0)) throw new Error(`Producto ${index + 1} inválido`);
    if (quantity < 0 || (unitPrice !== null && unitPrice < 0)) throw new Error(`Producto ${index + 1} inválido`);
    if (unitsPerPackage !== null && (!Number.isInteger(unitsPerPackage) || unitsPerPackage <= 0)) throw new Error(`Producto ${index + 1} inválido`);
    return {
      productType,
      productName,
      activeIngredient,
      concentration,
      pharmaceuticalForm,
      brand,
      model,
      description,
      presentation,
      unitsPerPackage,
      manufacturer: manufacturer ?? (device ? brand : null),
      originCountry,
      supplierCountry,
      supplierId,
      quantity,
      sanitaryRegistry,
      condition,
      batchNumber,
      expirationDate,
      unitPrice,
      totalPrice: unitPrice !== null ? quantity * unitPrice : null,
    };
  });
}

export function computeQuoteTotal(items: ParsedQuoteItem[]): number | null {
  return items.some((item) => item.totalPrice !== null) ? items.reduce((sum, item) => sum + (item.totalPrice ?? 0), 0) : null;
}

export type QuoteItemSupplierSnapshot = {
  id: string;
  manufacturer: string | null;
  originCountry: string | null;
  country: string | null;
};

export function applyQuoteItemSuppliers(
  items: ParsedQuoteItem[],
  suppliers: QuoteItemSupplierSnapshot[],
  asDraft: boolean,
): ParsedQuoteItem[] {
  const byId = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  return items.map((item, index) => {
    if (!item.supplierId) {
      if (!asDraft) throw new Error(`Producto ${index + 1}: selecciona un proveedor`);
      return { ...item, manufacturer: item.manufacturer, originCountry: item.originCountry, supplierCountry: item.supplierCountry };
    }
    const supplier = byId.get(item.supplierId);
    if (!supplier) throw new Error(`Producto ${index + 1}: el proveedor seleccionado no es válido`);
    return {
      ...item,
      manufacturer: supplier.manufacturer,
      originCountry: supplier.originCountry,
      supplierCountry: supplier.country,
    };
  });
}

export const DEFAULT_QUOTE_VALIDITY_DAYS = 7;

export function formatLocalDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function defaultQuoteValidUntilDate(from = new Date()) {
  const date = new Date(from);
  date.setDate(date.getDate() + DEFAULT_QUOTE_VALIDITY_DAYS);
  return formatLocalDate(date);
}

/** Returns the parsed validUntil date, or throws with a user-facing message if invalid. */
export function parseValidUntil(value: unknown, asDraft: boolean): Date | null {
  const raw = typeof value === "string" && value.trim() ? new Date(value) : null;
  if (!asDraft && (!raw || Number.isNaN(raw.getTime()) || raw <= new Date())) throw new Error("La fecha de vencimiento debe ser futura");
  if (raw && Number.isNaN(raw.getTime())) throw new Error("La fecha de vencimiento no es válida");
  return raw && !Number.isNaN(raw.getTime()) ? raw : null;
}

export function formatEstimatedShippingDays(days: number | null | undefined) {
  if (!days) return null;
  return days === 1 ? "1 día hábil" : `${days} días hábiles`;
}

export function parseEstimatedShippingDays(value: unknown, asDraft: boolean): number | null {
  if (value === undefined || value === null || value === "") {
    if (asDraft) return null;
    throw new Error("Indica el tiempo estimado de envío en días hábiles");
  }
  const days = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(days) || days <= 0 || days > 365) {
    throw new Error("El tiempo estimado de envío debe ser un número entero de días hábiles entre 1 y 365");
  }
  return days;
}
