import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { isValidRut, normalizeEmail, normalizeRut } from "@/lib/customer-validation";
import { prisma } from "@/lib/prisma";

function validatePassword(password: string): string | null {
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return "La contraseña debe tener 8 caracteres, mayúscula, minúscula y número.";
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const token = String(formData.get("token") ?? "").trim();
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const email = normalizeEmail(String(formData.get("email") ?? ""));
    const rut = normalizeRut(String(formData.get("rut") ?? ""));
    const password = String(formData.get("password") ?? "").trim();
    const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();

    if (!token || !firstName || !lastName || !phone || !email || !rut || !password || !confirmPassword) {
      return NextResponse.json({ error: "Completa todos los campos obligatorios." }, { status: 400 });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Las contraseñas no coinciden." }, { status: 400 });
    }

    if (!isValidRut(rut)) {
      return NextResponse.json({ error: "El RUT ingresado no es válido." }, { status: 400 });
    }

    const invitation = await prisma.internalUserInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json({ error: "La invitación no es válida o no existe." }, { status: 404 });
    }

    if (invitation.status !== "PENDING") {
      return NextResponse.json({ error: "Esta invitación ya fue utilizada o ya no es válida." }, { status: 410 });
    }

    if (new Date(invitation.expiresAt).getTime() < Date.now()) {
      await prisma.internalUserInvitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ error: "La invitación ha vencido." }, { status: 410 });
    }

    const isValidRole = invitation.role === "EJECUTIVO" || invitation.role === "ADMINISTRADOR";
    if (normalizeEmail(invitation.email) !== email || normalizeRut(invitation.rut) !== rut || !isValidRole) {
      return NextResponse.json({ error: "La invitación no coincide con los datos del registro." }, { status: 400 });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { rut }] },
      select: { id: true, email: true, rut: true },
    });

    if (existingUser) {
      return NextResponse.json({ error: existingUser.email === email ? "Ya existe un usuario con este correo." : "Ya existe un usuario con este RUT." }, { status: 409 });
    }

    let avatarUrl: string | null = null;
    const rawAvatar = formData.get("avatar");
    if (rawAvatar instanceof File && rawAvatar.size > 0) {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowed.includes(rawAvatar.type)) {
        return NextResponse.json({ error: "El archivo adjunto debe ser una imagen válida." }, { status: 400 });
      }

      const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
      await fs.mkdir(uploadDir, { recursive: true });
      const extension = rawAvatar.name.split(".").pop() || "png";
      const fileName = `${crypto.randomUUID()}.${extension}`;
      const filePath = path.join(uploadDir, fileName);
      const bytes = Buffer.from(await rawAvatar.arrayBuffer());
      await fs.writeFile(filePath, bytes);
      avatarUrl = `/uploads/avatars/${fileName}`;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          firstName,
          lastName,
          email,
          rut,
          phone,
          role: invitation.role,
          passwordHash,
          avatarUrl,
        },
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      });

      await transaction.internalUserInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "USED",
          usedAt: new Date(),
        },
      });

      return createdUser;
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
      message: "Usuario creado correctamente.",
    }, { status: 201 });
  } catch (error) {
    console.error("Error registering internal user:", error);
    return NextResponse.json({ error: "No fue posible completar el registro." }, { status: 500 });
  }
}
