const quoteItemConditions = ["AVAILABLE", "SPECIAL_IMPORT"] as const;

export type QuoteItemPayload = {
  productName?: unknown;
  activeIngredient?: unknown;
  concentration?: unknown;
  pharmaceuticalForm?: unknown;
  presentation?: unknown;
  unitsPerPackage?: unknown;
  manufacturer?: unknown;
  originCountry?: unknown;
  supplierCountry?: unknown;
  quantity?: unknown;
  sanitaryRegistry?: unknown;
  condition?: unknown;
  batchNumber?: unknown;
  expirationDate?: unknown;
  unitPrice?: unknown;
};

export type ParsedQuoteItem = {
  productName: string;
  activeIngredient: string | null;
  concentration: string | null;
  pharmaceuticalForm: string | null;
  presentation: string | null;
  unitsPerPackage: number | null;
  manufacturer: string | null;
  originCountry: string | null;
  supplierCountry: string | null;
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
export function parseQuoteItems(rawItems: QuoteItemPayload[], asDraft: boolean): ParsedQuoteItem[] {
  return rawItems.map((item, index) => {
    const productName = typeof item.productName === "string" ? item.productName.trim() : "";
    const activeIngredient = typeof item.activeIngredient === "string" ? item.activeIngredient.trim() : null;
    const concentration = typeof item.concentration === "string" ? item.concentration.trim() : null;
    const pharmaceuticalForm = typeof item.pharmaceuticalForm === "string" && item.pharmaceuticalForm.trim() ? item.pharmaceuticalForm.trim() : null;
    const presentation = typeof item.presentation === "string" && item.presentation.trim() ? item.presentation.trim() : null;
    const manufacturer = typeof item.manufacturer === "string" && item.manufacturer.trim() ? item.manufacturer.trim() : null;
    const originCountry = typeof item.originCountry === "string" && item.originCountry.trim() ? item.originCountry.trim() : null;
    const supplierCountry = typeof item.supplierCountry === "string" && item.supplierCountry.trim() ? item.supplierCountry.trim() : null;
    const sanitaryRegistry = typeof item.sanitaryRegistry === "string" && item.sanitaryRegistry.trim() ? item.sanitaryRegistry.trim() : null;
    const batchNumber = typeof item.batchNumber === "string" && item.batchNumber.trim() ? item.batchNumber.trim() : null;
    const condition = quoteItemConditions.includes(item.condition as (typeof quoteItemConditions)[number]) ? (item.condition as (typeof quoteItemConditions)[number]) : null;
    const expirationDate = typeof item.expirationDate === "string" && item.expirationDate.trim() ? new Date(item.expirationDate) : null;
    if (expirationDate && Number.isNaN(expirationDate.getTime())) throw new Error(`Producto ${index + 1} inválido`);
    if (!productName) throw new Error(`Producto ${index + 1} inválido`);
    // cantidad de unidades solicitadas (ej. cajas), distinta de las unidades contenidas por presentación
    const quantityRaw = item.quantity === undefined || item.quantity === null || item.quantity === "" ? 0 : Number(item.quantity);
    const quantity = Number.isFinite(quantityRaw) ? Math.trunc(quantityRaw) : 0;
    const unitsPerPackage = item.unitsPerPackage === undefined || item.unitsPerPackage === null || item.unitsPerPackage === "" ? null : Number(item.unitsPerPackage);
    const unitPriceRaw = item.unitPrice === undefined || item.unitPrice === null || item.unitPrice === "" ? null : Number(item.unitPrice);
    const unitPrice = unitPriceRaw !== null && Number.isFinite(unitPriceRaw) ? unitPriceRaw : null;
    if (!asDraft && (!Number.isInteger(quantity) || quantity <= 0 || unitPrice === null || unitPrice < 0)) throw new Error(`Producto ${index + 1} inválido`);
    if (quantity < 0 || (unitPrice !== null && unitPrice < 0)) throw new Error(`Producto ${index + 1} inválido`);
    if (unitsPerPackage !== null && (!Number.isInteger(unitsPerPackage) || unitsPerPackage <= 0)) throw new Error(`Producto ${index + 1} inválido`);
    return {
      productName,
      activeIngredient,
      concentration,
      pharmaceuticalForm,
      presentation,
      unitsPerPackage,
      manufacturer,
      originCountry,
      supplierCountry,
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

/** Returns the parsed validUntil date, or throws with a user-facing message if invalid. */
export function parseValidUntil(value: unknown, asDraft: boolean): Date | null {
  const raw = typeof value === "string" && value.trim() ? new Date(value) : null;
  if (!asDraft && (!raw || Number.isNaN(raw.getTime()) || raw <= new Date())) throw new Error("La fecha de vencimiento debe ser futura");
  if (raw && Number.isNaN(raw.getTime())) throw new Error("La fecha de vencimiento no es válida");
  return raw && !Number.isNaN(raw.getTime()) ? raw : null;
}
