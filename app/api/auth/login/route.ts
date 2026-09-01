import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CUSTOMER_SESSION_COOKIE, INTERNAL_SESSION_COOKIE, createCustomerSessionToken, createInternalSessionToken } from "@/lib/auth";
import { normalizeEmail } from "@/lib/customer-validation";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string; accountType?: "client" | "executive" };
    const email = normalizeEmail(body.email ?? "");
    const password = (body.password ?? "").trim();
    const accountType = body.accountType ?? "client";

    if (!email || !password) {
      return NextResponse.json({ error: "Ingresa tu correo y contraseña." }, { status: 400 });
    }

    if (accountType === "executive") {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, firstName: true, lastName: true, email: true, passwordHash: true, role: true },
      });

      if (!user || !user.passwordHash) {
        return NextResponse.json({ error: "Credenciales inválidas para acceso interno." }, { status: 401 });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return NextResponse.json({ error: "Credenciales inválidas para acceso interno." }, { status: 401 });
      }

      const token = createInternalSessionToken(user.id);
      const response = NextResponse.json({
        ok: true,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        },
      });

      response.cookies.set(CUSTOMER_SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: new Date(0) });
      response.cookies.set(INTERNAL_SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      return response;
    }

    const customer = await prisma.customer.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, passwordHash: true },
    });

    if (!customer || !customer.passwordHash) {
      return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
    }

    const isValidPassword = await bcrypt.compare(password, customer.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
    }

    const token = createCustomerSessionToken(customer.id);
    const response = NextResponse.json({
      ok: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
      },
    });

    response.cookies.set(INTERNAL_SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: new Date(0) });
    response.cookies.set(CUSTOMER_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Error logging in:", error);
    return NextResponse.json({ error: "No fue posible iniciar sesión." }, { status: 500 });
  }
}
