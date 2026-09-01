import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { INTERNAL_SESSION_COOKIE, verifyInternalSessionToken } from "@/lib/auth";
import { isValidRut, normalizeCustomerName, normalizeEmail, normalizeRut } from "@/lib/customer-validation";
import { normalizeSearchValue } from "@/lib/search";
import { getInternalActor } from "@/lib/internal-access";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(INTERNAL_SESSION_COOKIE)?.value;
    const auth = verifyInternalSessionToken(sessionToken);

    if (!auth) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const actor = await prisma.user.findUnique({ where: { id: auth.userId }, select: { id: true } });
    if (!actor) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

    import { getInternalActor } from "@/lib/internal-access";
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(Number.parseInt(searchParams.get("limit") || "10", 10), 50));
    const rawQuery = searchParams.get("q") ?? "";
    const statusFilter = searchParams.get("status") ?? "";
    const normalizedQuery = normalizeSearchValue(rawQuery);
    const skip = (page - 1) * limit;

    const customers = await prisma.customer.findMany({
      where: normalizedQuery
        ? {
            OR: [
              { name: { contains: normalizedQuery } },
              { email: { contains: normalizedQuery } },
              { city: { contains: normalizedQuery } },
              { rut: { contains: normalizedQuery } },
            ],
          }
        : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        rut: true,
      if ((payload as { internal?: unknown }).internal === true) {
        if (!await getInternalActor()) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
        if (![firstName, lastName, phone, email, rut, city].every((value) => value && value.trim() !== "")) return NextResponse.json({ error: "Completa todos los campos obligatorios." }, { status: 400 });
        if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Revisa el formato del correo." }, { status: 400 });
        if (!isValidRut(rut)) return NextResponse.json({ error: "El RUT ingresado no es válido. Verifica el dígito verificador." }, { status: 400 });
        const existing = await prisma.customer.findFirst({ where: { OR: [{ email }, { rut }] }, select: { id: true } });
        if (existing) return NextResponse.json({ error: "El correo o RUT ya está registrado." }, { status: 409 });
        const customer = await prisma.customer.create({ data: { name: fullName, phone, email, rut, city }, select: { id: true, name: true, email: true, phone: true, rut: true, city: true, createdAt: true } });
        return NextResponse.json({ ...customer, createdAt: customer.createdAt.toISOString() }, { status: 201 });
      }
        city: true,
        hasPendingRequest: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { requests: true } },
        requests: {
          select: { status: true, updatedAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const customersWithStatus = customers.map((customer) => {
      const latest = customer.requests[0];
      const latestStatus = latest?.status ?? null;
      const statusLabel = latestStatus && ["RECEIVED", "SOURCING", "QUOTED", "AWAITING_DECISION"].includes(latestStatus)
        ? "En proceso"
        : latestStatus && ["ACCEPTED", "SHIPPING", "COMPLETED"].includes(latestStatus)
          ? "Activo"
          : latestStatus && ["REJECTED", "CANCELLED"].includes(latestStatus)
            ? "Finalizado"
            : customer.hasPendingRequest
              ? "Pendiente"
              : "Pendiente";

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        rut: customer.rut,
        city: customer.city,
        hasPendingRequest: customer.hasPendingRequest,
        status: statusLabel,
        requestCount: customer._count.requests,
        lastActivity: latest?.updatedAt?.toISOString() ?? customer.updatedAt.toISOString(),
        createdAt: customer.createdAt.toISOString(),
      };
    });

    const filteredCustomers = customersWithStatus.filter((customer) => {
      const statusMatch = !statusFilter || statusFilter === "Todos los estados" || customer.status === statusFilter;
      return statusMatch;
    });

    const total = filteredCustomers.length;
    const paginatedCustomers = filteredCustomers.slice(skip, skip + limit);

    const summary = {
      totalCustomers: total,
      activeCustomers: filteredCustomers.filter((customer) => customer.status === "Activo").length,
      inProcessCustomers: filteredCustomers.filter((customer) => customer.status === "En proceso").length,
      pendingCustomers: filteredCustomers.filter((customer) => customer.status === "Pendiente").length,
    };

    return NextResponse.json({
      customers: paginatedCustomers,
      summary,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json({ error: "Error al obtener clientes" }, { status: 500 });
  }
}

type RegistrationPayload = {
  name: string;
  lastName: string;
  phone: string;
  email: string;
  rut: string;
  city: string;
  password: string;
  confirmPassword: string;
  hasPendingRequest: boolean;
  promotionsConsent: boolean;
  acceptsDataTreatment: boolean;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as Partial<RegistrationPayload>;
  const firstName = normalizeCustomerName(payload.name ?? "");
  const lastName = normalizeCustomerName(payload.lastName ?? "");
  const phone = (payload.phone ?? "").trim();
  const email = normalizeEmail(payload.email ?? "");
  const rut = normalizeRut(payload.rut ?? "");
  const city = (payload.city ?? "").trim();
  const password = (payload.password ?? "").trim();
  const confirmPassword = (payload.confirmPassword ?? "").trim();
  const fullName = normalizeCustomerName(`${firstName} ${lastName}`);
  const isInternalCreation = (payload as { internal?: unknown }).internal === true;

  if (![firstName, lastName, phone, email, rut, city, ...(isInternalCreation ? [] : [password])].every((value) => value && value.trim() !== "")) {
    return NextResponse.json({ error: "Completa todos los campos obligatorios." }, { status: 400 });
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Revisa el formato del correo." }, { status: 400 });
  }

  if (!isValidRut(rut)) {
    return NextResponse.json({ error: "El RUT ingresado no es válido. Verifica el dígito verificador." }, { status: 400 });
  }

  if (isInternalCreation) {
    if (!await getInternalActor()) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    const existing = await prisma.customer.findFirst({ where: { OR: [{ email }, { rut }] }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "El correo o RUT ya está registrado." }, { status: 409 });
    const customer = await prisma.customer.create({ data: { name: fullName, phone, email, rut, city }, select: { id: true, name: true, email: true, phone: true, rut: true, city: true, createdAt: true } });
    return NextResponse.json({ ...customer, createdAt: customer.createdAt.toISOString() }, { status: 201 });
  }

  if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return NextResponse.json({ error: "La contraseña debe tener 8 caracteres, mayúscula, minúscula y número." }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Las contraseñas no coinciden." }, { status: 400 });
  }

  if (payload.acceptsDataTreatment !== true) {
    return NextResponse.json({ error: "Debes aceptar el tratamiento de datos personales." }, { status: 400 });
  }

  const existingCustomer = await prisma.customer.findMany({
    select: { id: true, email: true, rut: true, passwordHash: true, name: true, phone: true, city: true },
  });

  const matchingCustomer = existingCustomer.find((customer) => {
    const sameEmail = normalizeEmail(customer.email) === email;
    const sameRut = normalizeRut(customer.rut) === rut;
    return sameEmail || sameRut;
  });

  if (matchingCustomer) {
    const sameEmail = normalizeEmail(matchingCustomer.email) === email;
    const sameRut = normalizeRut(matchingCustomer.rut) === rut;

    if (matchingCustomer.passwordHash && (sameEmail || sameRut)) {
      return NextResponse.json({ error: sameEmail ? "Ya existe una cuenta con este correo." : "Ya existe una cuenta con este RUT." }, { status: 409 });
    }

    if (sameEmail && !sameRut) {
      return NextResponse.json({ error: "Ya existe una cuenta con este correo." }, { status: 409 });
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const customer = await prisma.$transaction(async (transaction) => {
    const targetCustomer = matchingCustomer
      ? await transaction.customer.update({
          where: { id: matchingCustomer.id },
          data: {
            name: fullName || matchingCustomer.name,
            phone: phone || matchingCustomer.phone,
            email,
            rut,
            city: city || matchingCustomer.city,
            passwordHash,
            hasPendingRequest: payload.hasPendingRequest === true || matchingCustomer.passwordHash === null,
            promotionsConsent: payload.promotionsConsent === true,
          },
          select: { id: true, name: true, email: true, hasPendingRequest: true, createdAt: true },
        })
      : await transaction.customer.create({
          data: {
            name: fullName,
            phone,
            email,
            rut,
            city,
            passwordHash,
            hasPendingRequest: payload.hasPendingRequest === true,
            promotionsConsent: payload.promotionsConsent === true,
          },
          select: { id: true, name: true, email: true, hasPendingRequest: true, createdAt: true },
        });

    const pendingRequests = await transaction.quoteRequest.findMany({
      where: {
        customerId: null,
        OR: [
          { requesterEmail: email },
          { requesterEmail: matchingCustomer?.email ?? email },
          { requesterRut: rut },
          { requesterRut: matchingCustomer?.rut ?? rut },
        ],
      },
      select: { id: true },
    });

    if (pendingRequests.length) {
      const requestIds = pendingRequests.map((requestItem) => requestItem.id);
      await transaction.quoteRequest.updateMany({
        where: { id: { in: requestIds } },
        data: { customerId: targetCustomer.id },
      });
      await transaction.prescription.updateMany({
        where: { requestId: { in: requestIds }, customerId: null },
        data: { customerId: targetCustomer.id },
      });
      await transaction.quoteRequest.updateMany({
        where: { id: { in: requestIds } },
        data: {
          requesterEmail: email,
          requesterRut: rut,
          requesterName: fullName,
          requesterPhone: phone,
          requesterCity: city,
        },
      });
    }

    return targetCustomer;
  });

  return NextResponse.json({
    id: customer.id,
    name: customer.name,
    email: customer.email,
    hasPendingRequest: customer.hasPendingRequest,
    createdAt: customer.createdAt,
  }, { status: 201 });
}
