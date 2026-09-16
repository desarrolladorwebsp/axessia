export const PORTAL_PAGE_SIZE = 20;

export function parsePage(value: string | null | undefined, fallback = 1) {
  const parsed = Number.parseInt(value ?? String(fallback), 10);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
}

export function paginationMeta(total: number, page: number, limit = PORTAL_PAGE_SIZE) {
  return {
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}
