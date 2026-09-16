import { prisma } from "@/lib/prisma";
import { applyQuoteItemSuppliers, type ParsedQuoteItem } from "@/lib/quote-items";

export async function attachSuppliersToQuoteItems(items: ParsedQuoteItem[], asDraft: boolean): Promise<ParsedQuoteItem[]> {
  const supplierIds = [...new Set(items.map((item) => item.supplierId).filter((id): id is string => Boolean(id)))];
  const suppliers = supplierIds.length
    ? await prisma.supplier.findMany({
        where: { id: { in: supplierIds } },
        select: { id: true, manufacturer: true, originCountry: true, country: true },
      })
    : [];
  return applyQuoteItemSuppliers(items, suppliers, asDraft);
}
