export function normalizeTrackingIdentifier(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

export function normalizeTrackingRequestNumberForComparison(value: string): string {
  const normalized = normalizeTrackingIdentifier(value);
  if (/^s[\da-z]+$/.test(normalized)) return normalized;
  if (/^\d+$/.test(normalized)) return `s${normalized}`;
  return normalized;
}

export function normalizeRutForComparison(rawValue: string): string {
  return rawValue
    .replace(/[\.\s-]/g, "")
    .toUpperCase()
    .replace(/[^0-9K]/g, "")
    .toLowerCase();
}

export function normalizeRut(rawValue: string): string {
  return normalizeRutForComparison(rawValue);
}

export function buildRequestNumberVariants(rawValue: string): string[] {
  const trimmed = rawValue.trim();
  if (!trimmed) return [];

  const variants = new Set<string>([
    trimmed,
    trimmed.toUpperCase(),
    trimmed.toLowerCase(),
  ]);

  const normalized = normalizeTrackingIdentifier(trimmed);

  if (/^s\d+$/.test(normalized)) {
    const suffix = normalized.slice(1);
    variants.add(`S-${suffix}`);
    variants.add(`S${suffix}`);
  }

  if (/^\d+$/.test(normalized)) {
    variants.add(`S-${normalized}`);
    variants.add(`S${normalized}`);
  }

  return [...variants];
}

export function trackingStorageKey(requestNumber: string): string {
  return `axessia-tracking-${normalizeTrackingRequestNumberForComparison(requestNumber)}`;
}

export function matchesTrackingCredentials(
  record: { requestNumber: string | null; requesterRut: string },
  requestNumberNormalized: string,
  rutNormalized: string,
): boolean {
  return (
    normalizeTrackingRequestNumberForComparison(record.requestNumber ?? "") ===
      normalizeTrackingRequestNumberForComparison(requestNumberNormalized) &&
    normalizeRutForComparison(record.requesterRut) === rutNormalized
  );
}
