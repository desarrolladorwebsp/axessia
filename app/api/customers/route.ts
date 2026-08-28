import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RegistrationPayload = {
  name: string;
  phone: string;
  email: string;
  rut: string;
  city: string;
  password: string;
  hasPendingRequest: boolean;
  promotionsConsent: boolean;
  acceptsDataTreatment: boolean;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as Partial<RegistrationPayload>;
  const email = payload.email?.trim().toLowerCase() ?? "";
  const name = payload.name?.trim() ?? "";
  const phone = payload.phone?.trim() ?? "";
  const rut = payload.rut?.trim() ?? "";
  const city = payload.city?.trim() ?? "";
  const password = payload.password ?? "";
  const requiredValues = [name, phone, email, rut, city, password];

  if (requiredValues.some((value) => !value?.trim())) {
    return NextResponse.json({ error: "Completa todos los campos obligatorios." }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Revisa el formato del correo." }, { status: 400 });
  }
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return NextResponse.json({ error: "La contraseña debe tener 8 caracteres, mayúscula, minúscula y número." }, { status: 400 });
  }
  if (payload.acceptsDataTreatment !== true) {
    return NextResponse.json({ error: "Debes aceptar el tratamiento de datos personales." }, { status: 400 });
  }

  const existingCustomer = await prisma.customer.findFirst({
    where: { OR: [{ email }, { rut }] },
    select: { email: true, rut: true },
  });
  if (existingCustomer) {
    return NextResponse.json({ error: existingCustomer.email === email ? "Ya existe una cuenta con este correo." : "Ya existe una cuenta con este RUT." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const customer = await prisma.$transaction(async (transaction) => {
    const createdCustomer = await transaction.customer.create({
      data: {
        name,
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
      where: { customerId: null, OR: [{ requesterEmail: email }, { requesterRut: rut }] },
      select: { id: true },
    });
    if (pendingRequests.length) {
      const requestIds = pendingRequests.map((requestItem) => requestItem.id);
      await transaction.quoteRequest.updateMany({ where: { id: { in: requestIds } }, data: { customerId: createdCustomer.id } });
      await transaction.prescription.updateMany({ where: { requestId: { in: requestIds }, customerId: null }, data: { customerId: createdCustomer.id } });
    }

    return createdCustomer;
  });

  return NextResponse.json(customer, { status: 201 });
}
