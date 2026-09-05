import { createHmac, timingSafeEqual } from "crypto";

export {
  normalizeRut,
  normalizeRutForComparison,
  normalizeTrackingIdentifier,
  buildRequestNumberVariants,
  trackingStorageKey,
  matchesTrackingCredentials,
} from "@/lib/tracking-normalization";

const TOKEN_TTL_SECONDS = 15 * 60;

function getSecret() {
  const secret =
    process.env.TRACKING_SECRET ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("TRACKING_SECRET must be configured in production");
  }
  return secret ?? "axessia-development-tracking-secret";
}

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function signature(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createTrackingToken(requestNumber: string) {
  const payload = encode(JSON.stringify({ requestNumber, expiresAt: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS }));
  return `${payload}.${signature(payload)}`;
}

export function readTrackingToken(token: string) {
  const [payload, providedSignature] = token.split(".");
  if (!payload || !providedSignature) return null;

  const expectedSignature = signature(payload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(providedSignature);
  if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { requestNumber?: unknown; expiresAt?: unknown };
    if (typeof parsed.requestNumber !== "string" || typeof parsed.expiresAt !== "number" || parsed.expiresAt < Math.floor(Date.now() / 1000)) return null;
    return parsed.requestNumber;
  } catch {
    return null;
  }
}
