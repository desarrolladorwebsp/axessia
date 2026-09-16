import { getAppBaseUrl } from "@/lib/app-url";
import { generateResetToken, hashResetToken, hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { isEmailDeliveryConfigured, sendCustomerPasswordResetEmail, sendPasswordResetEmail } from "@/lib/services/email";

const RESET_TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour

export const GENERIC_FORGOT_PASSWORD_MESSAGE =
  "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos.";

type InternalResetLookup =
  | { status: "valid"; tokenId: string; userId: string }
  | { status: "invalid"; message: string }
  | { status: "expired"; message: string }
  | { status: "used"; message: string };

type CustomerResetLookup =
  | { status: "valid"; tokenId: string; customerId: string }
  | { status: "invalid"; message: string }
  | { status: "expired"; message: string }
  | { status: "used"; message: string };

export type PasswordResetLookupResult =
  | { status: "valid"; audience: "customer"; tokenId: string; customerId: string }
  | { status: "valid"; audience: "internal"; tokenId: string; userId: string }
  | { status: "invalid"; message: string }
  | { status: "expired"; message: string }
  | { status: "used"; message: string };

function invalidResetMessage() {
  return "El enlace de recuperación no es válido. Solicita uno nuevo desde el inicio de sesión.";
}

function usedResetMessage() {
  return "Este enlace ya fue utilizado. Solicita uno nuevo si necesitas restablecer tu contraseña.";
}

function expiredResetMessage() {
  return "El enlace de recuperación ha vencido. Solicita uno nuevo desde el inicio de sesión.";
}

export function buildPasswordResetUrl(token: string): string {
  return `${getAppBaseUrl()}/restablecer-contrasena?token=${encodeURIComponent(token)}`;
}

export async function requestInternalPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, firstName: true, lastName: true, passwordHash: true },
  });

  if (!user?.passwordHash || !isEmailDeliveryConfigured()) {
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

export async function requestCustomerPasswordReset(email: string): Promise<void> {
  const customer = await prisma.customer.findUnique({
    where: { email },
    select: { id: true, name: true, passwordHash: true },
  });

  if (!customer?.passwordHash || !isEmailDeliveryConfigured()) {
    return;
  }

  const token = generateResetToken();
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.$transaction(async (transaction) => {
    await transaction.customerPasswordResetToken.updateMany({
      where: {
        customerId: customer.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });

    await transaction.customerPasswordResetToken.create({
      data: {
        customerId: customer.id,
        tokenHash,
        expiresAt,
      },
    });
  });

  await sendCustomerPasswordResetEmail({
    email,
    customerName: customer.name.trim() || email,
    resetUrl: buildPasswordResetUrl(token),
  });
}

export async function lookupInternalPasswordResetToken(token: string): Promise<InternalResetLookup> {
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
    return { status: "invalid", message: invalidResetMessage() };
  }

  if (record.usedAt) {
    return { status: "used", message: usedResetMessage() };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    return { status: "expired", message: expiredResetMessage() };
  }

  return {
    status: "valid",
    tokenId: record.id,
    userId: record.userId,
  };
}

export async function lookupCustomerPasswordResetToken(token: string): Promise<CustomerResetLookup> {
  const tokenHash = hashResetToken(token);

  const record = await prisma.customerPasswordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      customerId: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (!record) {
    return { status: "invalid", message: invalidResetMessage() };
  }

  if (record.usedAt) {
    return { status: "used", message: usedResetMessage() };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    return { status: "expired", message: expiredResetMessage() };
  }

  return {
    status: "valid",
    tokenId: record.id,
    customerId: record.customerId,
  };
}

export async function lookupPasswordResetToken(token: string): Promise<PasswordResetLookupResult> {
  const customerLookup = await lookupCustomerPasswordResetToken(token);
  if (customerLookup.status === "valid") {
    return { ...customerLookup, audience: "customer" };
  }
  if (customerLookup.status !== "invalid") {
    return customerLookup;
  }

  const internalLookup = await lookupInternalPasswordResetToken(token);
  if (internalLookup.status === "valid") {
    return { ...internalLookup, audience: "internal" };
  }
  return internalLookup;
}

export async function resetInternalPassword(token: string, password: string): Promise<InternalResetLookup> {
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

    await transaction.internalPasswordResetToken.updateMany({
      where: { userId: lookup.userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  });

  return lookup;
}

export async function resetPasswordWithToken(token: string, password: string): Promise<PasswordResetLookupResult> {
  const lookup = await lookupPasswordResetToken(token);

  if (lookup.status !== "valid") {
    return lookup;
  }

  const passwordHash = await hashPassword(password);

  if (lookup.audience === "customer") {
    await prisma.$transaction(async (transaction) => {
      await transaction.customer.update({
        where: { id: lookup.customerId },
        data: { passwordHash },
      });

      await transaction.customerPasswordResetToken.updateMany({
        where: { customerId: lookup.customerId, usedAt: null },
        data: { usedAt: new Date() },
      });
    });
    return lookup;
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({
      where: { id: lookup.userId },
      data: { passwordHash },
    });

    await transaction.internalPasswordResetToken.updateMany({
      where: { userId: lookup.userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  });

  return lookup;
}
