import { getAppBaseUrl } from "@/lib/app-url";
import { generateResetToken, hashResetToken, hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/services/email";

const RESET_TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour

export const GENERIC_FORGOT_PASSWORD_MESSAGE =
  "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos.";

type ResetTokenLookupResult =
  | { status: "valid"; tokenId: string; userId: string }
  | { status: "invalid"; message: string }
  | { status: "expired"; message: string }
  | { status: "used"; message: string };

export function buildPasswordResetUrl(token: string): string {
  return `${getAppBaseUrl()}/restablecer-contrasena?token=${encodeURIComponent(token)}`;
}

export async function requestInternalPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, firstName: true, lastName: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    return;
  }

  const token = generateResetToken();
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.$transaction(async (transaction) => {
    await transaction.internalPasswordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });

    await transaction.internalPasswordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });
  });

  const resetUrl = buildPasswordResetUrl(token);
  const fullName = `${user.firstName} ${user.lastName}`.trim() || email;

  await sendPasswordResetEmail({
    email,
    fullName,
    resetUrl,
  });
}

export async function lookupInternalPasswordResetToken(token: string): Promise<ResetTokenLookupResult> {
  const tokenHash = hashResetToken(token);

  const record = await prisma.internalPasswordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (!record) {
    return {
      status: "invalid",
      message: "El enlace de recuperación no es válido. Solicita uno nuevo desde el inicio de sesión.",
    };
  }

  if (record.usedAt) {
    return {
      status: "used",
      message: "Este enlace ya fue utilizado. Solicita uno nuevo si necesitas restablecer tu contraseña.",
    };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    return {
      status: "expired",
      message: "El enlace de recuperación ha vencido. Solicita uno nuevo desde el inicio de sesión.",
    };
  }

  return {
    status: "valid",
    tokenId: record.id,
    userId: record.userId,
  };
}

export async function resetInternalPassword(token: string, password: string): Promise<ResetTokenLookupResult> {
  const lookup = await lookupInternalPasswordResetToken(token);

  if (lookup.status !== "valid") {
    return lookup;
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({
      where: { id: lookup.userId },
      data: { passwordHash },
    });

    await transaction.internalPasswordResetToken.update({
      where: { id: lookup.tokenId },
      data: { usedAt: new Date() },
    });
  });

  return lookup;
}
