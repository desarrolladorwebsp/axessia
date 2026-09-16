import type { SupplierRecord } from "../../lib/supplier-validation";

type WhereArg = {
  OR?: Array<Record<string, { contains?: string; not?: null }>>;
  AND?: Array<WhereArg | Record<string, { not?: null }>>;
  email?: { not?: null; contains?: string };
  phone?: { not?: null; contains?: string };
  identifier?: { not?: null; contains?: string };
  name?: { contains?: string };
  contactName?: { contains?: string };
};

function matchesContains(value: string | null, query?: string) {
  if (!query) return true;
  return (value ?? "").toLowerCase().includes(query.toLowerCase());
}

function matchesWhere(row: SupplierRecord, where?: WhereArg): boolean {
  if (!where || Object.keys(where).length === 0) return true;

  if (where.AND) {
    return where.AND.every((part) => matchesWhere(row, part as WhereArg));
  }

  if (where.OR) {
    return where.OR.some((part) => matchesWhere(row, part as WhereArg));
  }

  const checks: boolean[] = [];
  if (where.name?.contains) checks.push(matchesContains(row.name, where.name.contains));
  if (where.identifier?.contains) checks.push(matchesContains(row.identifier, where.identifier.contains));
  if (where.contactName?.contains) checks.push(matchesContains(row.contactName, where.contactName.contains));
  if (where.email?.contains) checks.push(matchesContains(row.email, where.email.contains));
  if (where.email?.not === null) checks.push(row.email !== null);
  if (where.phone?.not === null) checks.push(row.phone !== null);
  if (where.identifier?.not === null) checks.push(row.identifier !== null);
  return checks.every(Boolean);
}

export function createMemorySupplierStore(seed: SupplierRecord[] = []) {
  const rows = [...seed];
  let sequence = 1;

  return {
    supplier: {
      async findMany({ where, skip = 0, take = rows.length }: { where?: WhereArg; skip?: number; take?: number }) {
        return rows
          .filter((row) => matchesWhere(row, where))
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
          .slice(skip, skip + take)
          .map((row) => ({ ...row }));
      },
      async count({ where }: { where?: WhereArg }) {
        return rows.filter((row) => matchesWhere(row, where)).length;
      },
      async findUnique({ where }: { where: { id: string } }) {
        return rows.find((row) => row.id === where.id) ?? null;
      },
      async create({ data }: { data: Omit<SupplierRecord, "id" | "createdAt" | "updatedAt"> }) {
        const now = new Date();
        const row: SupplierRecord = {
          ...data,
          id: `supplier-${sequence}`,
          createdAt: now,
          updatedAt: now,
        };
        sequence += 1;
        rows.unshift(row);
        return { ...row };
      },
      async update({ where, data }: { where: { id: string }; data: Omit<SupplierRecord, "id" | "createdAt" | "updatedAt"> }) {
        const index = rows.findIndex((row) => row.id === where.id);
        if (index === -1) throw new Error("Record to update not found.");
        const current = rows[index];
        const next: SupplierRecord = {
          ...current,
          ...data,
          updatedAt: new Date(current.updatedAt.getTime() + 1000),
        };
        rows[index] = next;
        return { ...next };
      },
      async delete({ where }: { where: { id: string } }) {
        const index = rows.findIndex((row) => row.id === where.id);
        if (index === -1) throw new Error("Record to delete not found.");
        const [removed] = rows.splice(index, 1);
        return removed;
      },
    },
  };
}
