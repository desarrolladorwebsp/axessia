export function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}\s@.-]/gu, "")
    .toLowerCase()
    .trim();
}

export function matchesSearchValue(value: string, query: string): boolean {
  const normalizedValue = normalizeSearchValue(value);
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) return true;

  return normalizedValue.includes(normalizedQuery);
}
