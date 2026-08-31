import crypto from "crypto";

export const CUSTOMER_SESSION_COOKIE = "axessia_customer_session";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const SESSION_SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "axessia-local-dev-secret";

function signSessionPayload(payload: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

export function createCustomerSessionToken(customerId: string): string {
  const issuedAt = Date.now();
  const payload = `${customerId}:${issuedAt}`;
  return `${payload}.${signSessionPayload(payload)}`;
}

export function verifyCustomerSessionToken(token?: string): { customerId: string } | null {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  if (signSessionPayload(payload) !== signature) return null;

  const [customerId, issuedAt] = payload.split(":");
  if (!customerId || !issuedAt) return null;

  const timestamp = Number(issuedAt);
  if (Number.isNaN(timestamp) || Date.now() - timestamp > SESSION_TTL_MS) {
    return null;
  }

  return { customerId };
}
