export const IVA_RATE = 0.19;

export type QuotePriceBreakdown = {
  subtotal: number;
  iva: number;
  total: number;
};

export function quotePriceBreakdownFromSubtotal(rawSubtotal: number): QuotePriceBreakdown {
  const subtotal = Math.round(rawSubtotal * 100) / 100;
  const iva = Math.round(subtotal * IVA_RATE);
  return { subtotal, iva, total: subtotal + iva };
}

export function quotePriceBreakdownFromItems(items: Array<{ totalPrice: unknown }>): QuotePriceBreakdown {
  return quotePriceBreakdownFromSubtotal(items.reduce((sum, item) => sum + (item.totalPrice == null ? 0 : Number(item.totalPrice)), 0));
}
