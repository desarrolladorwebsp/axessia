import { createHash, randomBytes } from "crypto";

// Web Checkout API REST — https://developers.banchilepagos.cl/
// Sandbox vs production base URL depends on BANCHILE_ENV (defaults to sandbox for safety).
const SANDBOX_BASE_URL = "https://checkout.test.banchilepagos.cl";
const PRODUCTION_BASE_URL = "https://checkout.banchilepagos.cl";

export type BanchileSessionStatusCode = "PENDING" | "APPROVED" | "REJECTED" | "APPROVED_PARTIAL" | "PARTIAL_EXPIRED";

export type BanchileSessionStatus = {
  status?: BanchileSessionStatusCode;
  reason?: string;
  message?: string;
  date?: string;
};

export type BanchileTransaction = {
  status?: { status?: string };
  internalReference?: number;
  reference?: string;
  authorization?: string;
  receipt?: string;
};

function getBaseUrl() {
  return process.env.BANCHILE_ENV === "production" ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL;
}

function getCredentials() {
  const login = process.env.BANCHILE_LOGIN;
  const secretKey = process.env.BANCHILE_SECRET_KEY;
  if (!login || !secretKey) throw new Error("Banchile Pagos no está configurado (BANCHILE_LOGIN / BANCHILE_SECRET_KEY).");
  return { login, secretKey };
}

// Auth per https://developers.banchilepagos.cl/configuracion-autenticacion:
// tranKey = Base64(SHA-256(rawNonce + seed + secretKey)), nonce = Base64(rawNonce).
function buildAuth() {
  const { login, secretKey } = getCredentials();
  const seed = new Date().toISOString();
  const rawNonce = randomBytes(16);
  const tranKey = createHash("sha256")
    .update(Buffer.concat([rawNonce, Buffer.from(seed + secretKey, "utf8")]))
    .digest("base64");
  return { login, tranKey, nonce: rawNonce.toString("base64"), seed };
}

async function callBanchile<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as T;
  return data;
}

/** Crear una sesión — POST /api/session */
export async function createBanchileSession(params: {
  reference: string;
  description: string;
  amountTotal: number;
  currency?: string;
  returnUrl: string;
  ipAddress: string;
  userAgent: string;
}) {
  const data = await callBanchile<{ status?: { status?: string; message?: string }; requestId?: number; processUrl?: string }>(
    "/api/session",
    {
      auth: buildAuth(),
      payment: {
        reference: params.reference,
        description: params.description,
        amount: { currency: params.currency ?? "CLP", total: params.amountTotal },
      },
      returnUrl: params.returnUrl,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  );

  if (data.status?.status !== "OK" || !data.requestId || !data.processUrl) {
    throw new Error(data.status?.message || "No fue posible crear la sesión de pago con Banchile Pagos.");
  }

  return { requestId: data.requestId, processUrl: data.processUrl };
}

/** Consultar una sesión — POST /api/session/:requestId */
export async function queryBanchileSession(requestId: string | number) {
  const data = await callBanchile<{
    requestId?: number;
    status?: BanchileSessionStatus;
    request?: { fields?: Array<{ keyword: string; value: string }> };
    payment?: BanchileTransaction[];
  }>(`/api/session/${requestId}`, { auth: buildAuth() });

  if (!data.status?.status) throw new Error(data.status?.message || "No fue posible consultar la sesión de pago con Banchile Pagos.");

  const processUrl = data.request?.fields?.find((field) => field.keyword === "_processUrl_")?.value ?? null;
  return { status: data.status, processUrl, payment: data.payment ?? [] };
}

/** Estados de sesión — ver "Cómo Funciona WebCheckout" en la documentación oficial. */
export function mapBanchileStatusToPaymentStatus(status: BanchileSessionStatusCode | undefined): "PAID" | "FAILED" | "PROCESSING" {
  if (status === "APPROVED") return "PAID";
  if (status === "REJECTED" || status === "PARTIAL_EXPIRED") return "FAILED";
  return "PROCESSING";
}
