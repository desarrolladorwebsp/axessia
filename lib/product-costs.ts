import { Prisma } from "@prisma/client";

type ProductCostExecutor = {
  $queryRaw<T>(query: Prisma.Sql): Promise<T>;
};

type CostableItem = {
  productId: string | null;
  productType: string;
  productName: string;
};

type ProductCostRow = { id: string; cost: unknown };

/**
 * Copies the current catalog cost to a quote line. The copied value is a
 * snapshot: later catalog edits must not change historical quotes.
 */
export async function attachProductCosts<T extends CostableItem>(executor: ProductCostExecutor, items: T[]) {
  return Promise.all(items.map(async (item) => {
    const selector = item.productId
      ? Prisma.sql`id = ${item.productId}`
      : Prisma.sql`productType = ${item.productType} AND productName = ${item.productName}`;
    const rows = await executor.$queryRaw<ProductCostRow[]>(Prisma.sql`
      SELECT id, cost
      FROM Product
      WHERE isActive = true AND ${selector}
      LIMIT 1
    `);
    const product = rows[0];
    return {
      ...item,
      productId: product?.id ?? null,
      unitCost: product?.cost == null ? null : Number(product.cost),
    };
  }));
}
