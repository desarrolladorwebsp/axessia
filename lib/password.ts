import bcrypt from "bcryptjs";
import crypto from "crypto";

const BCRYPT_ROUNDS = 12;
const TOKEN_SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "axessia-local-dev-secret";

export const PASSWORD_POLICY_MESSAGE =
  "La contraseña debe tener 8 caracteres, mayúscula, minúscula y número.";

export function validatePassword(password: string): string | null {
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return PASSWORD_POLICY_MESSAGE;
  }

  return null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashResetToken(token: string): string {
  return crypto.createHmac("sha256", TOKEN_SECRET).update(token).digest("hex");
}

export function isValidResetTokenFormat(token: string): boolean {
  return /^[a-f0-9]{64}$/i.test(token);
}
