export function normalizeRut(rawValue: string): string {
  const compact = rawValue.replace(/[\.\s]/g, "").toUpperCase().replace(/-/g, "");
  if (!compact) return "";

  const digits = compact.replace(/[^0-9K]/g, "");
  if (!digits || digits.length < 2) return "";

  const verifier = digits.at(-1) ?? "";
  const numericPart = digits.slice(0, -1);

  if (!/^[0-9]+$/.test(numericPart) || !/^[0-9K]$/.test(verifier)) {
    return "";
  }

  return `${numericPart}-${verifier}`;
}

export function isValidRut(rawValue: string): boolean {
  const normalized = normalizeRut(rawValue);
  if (!normalized) return false;

  const [digitsString, verifier] = normalized.split("-");
  if (!digitsString || !verifier || digitsString.length < 7 || digitsString.length > 8) {
    return false;
  }

  const digits = digitsString.split("").map(Number);
  let sum = 0;
  let multiplier = 2;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    sum += digits[index] * multiplier;
    multiplier += 1;
    if (multiplier > 7) multiplier = 2;
  }

  const remainder = 11 - (sum % 11);
  const expectedVerifier = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);

  return expectedVerifier === verifier.toUpperCase();
}

export function normalizeEmail(rawValue: string): string {
  return rawValue.trim().toLowerCase();
}

export function normalizeCustomerName(rawValue: string): string {
  const trimmed = rawValue.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\s+/g, " ");
}
