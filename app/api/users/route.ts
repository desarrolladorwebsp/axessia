import { prisma } from "@/lib/prisma";
import { INTERNAL_SESSION_COOKIE, verifyInternalSessionToken } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { matchesSearchValue, normalizeSearchValue } from "@/lib/search";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(INTERNAL_SESSION_COOKIE)?.value;
    const auth = verifyInternalSessionToken(sessionToken);

    if (!auth) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const actor = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, role: true },
    });

    if (!actor || actor.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No tienes permisos para ver usuarios internos." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(Number.parseInt(searchParams.get("limit") || "10", 10), 50));
    const rawQuery = searchParams.get("q") ?? "";
    const roleFilter = searchParams.get("role") ?? "";
    const normalizedQuery = normalizeSearchValue(rawQuery);
    const skip = (page - 1) * limit;

    const role = roleFilter === "Ejecutivo" ? UserRole.EJECUTIVO : roleFilter === "Administrador" ? UserRole.ADMINISTRADOR : undefined;
    const where = {
      ...(role ? { role } : {}),
      ...(normalizedQuery
        ? {
            OR: [
              { firstName: { contains: normalizedQuery } },
              { lastName: { contains: normalizedQuery } },
              { email: { contains: normalizedQuery } },
              { rut: { contains: normalizedQuery } },
            ],
          }
        : {}),
    };
    const [users, total, roleSummary] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          rut: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
      prisma.user.groupBy({ by: ["role"], _count: { _all: true }, where }),
    ]);
    const roleCounts = Object.fromEntries(roleSummary.map((item) => [item.role, item._count._all]));

    return NextResponse.json({
      users,
      summary: {
        administrators: roleCounts.ADMINISTRADOR ?? 0,
        executives: roleCounts.EJECUTIVO ?? 0,
      },
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(INTERNAL_SESSION_COOKIE)?.value;
    const auth = verifyInternalSessionToken(sessionToken);

    if (!auth) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const actor = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, role: true },
    });

    if (!actor || actor.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No tienes permisos para crear usuarios internos." }, { status: 403 });
    }

    const body = await request.json();
    const { firstName, lastName, email, rut, role } = body;

    if (!firstName || !lastName || !email || !rut || !role) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
    }

    if (!["EJECUTIVO", "ADMINISTRADOR"].includes(role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { rut: rut.toUpperCase() },
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json({ error: "El email o RUT ya está registrado" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        rut: rut.toUpperCase().trim(),
        role,
      },
    });

    return NextResponse.json(
      {
        message: "Usuario creado correctamente",
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 });
  }
}
