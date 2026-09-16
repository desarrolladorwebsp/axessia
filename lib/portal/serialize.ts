function money(value: { toString(): string } | number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  return value.toString();
}

export function serializeMoney(value: { toString(): string } | number | string | null | undefined) {
  return money(value);
}

export function iso(value: Date | null | undefined) {
  return value?.toISOString() ?? null;
}
