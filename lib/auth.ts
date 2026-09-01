import crypto from "crypto";

export const CUSTOMER_SESSION_COOKIE = "axessia_customer_session";
export const INTERNAL_SESSION_COOKIE = "axessia_internal_session";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const SESSION_SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "axessia-local-dev-secret";

function signSessionPayload(payload: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

function createSessionToken(subjectId: string): string {
  const issuedAt = Date.now();
  const payload = `${subjectId}:${issuedAt}`;
  return `${payload}.${signSessionPayload(payload)}`;
}

export function createCustomerSessionToken(customerId: string): string {
  return createSessionToken(customerId);
}

export function createInternalSessionToken(userId: string): string {
  return createSessionToken(userId);
}

function verifySessionToken(token?: string): { userId: string } | null {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  if (signSessionPayload(payload) !== signature) return null;

  const [userId, issuedAt] = payload.split(":");
  if (!userId || !issuedAt) return null;

  const timestamp = Number(issuedAt);
  if (Number.isNaN(timestamp) || Date.now() - timestamp > SESSION_TTL_MS) {
    return null;
  }

  return { userId };
}

export function verifyCustomerSessionToken(token?: string): { customerId: string } | null {
  const session = verifySessionToken(token);
  if (!session) return null;
  return { customerId: session.userId };
}

export function verifyInternalSessionToken(token?: string): { userId: string } | null {
  return verifySessionToken(token);
}
