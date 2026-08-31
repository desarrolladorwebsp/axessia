import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidRut, normalizeCustomerName, normalizeEmail, normalizeRut } from "@/lib/customer-validation";

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

  if (![firstName, lastName, phone, email, rut, city, password].every((value) => value && value.trim() !== "")) {
    return NextResponse.json({ error: "Completa todos los campos obligatorios." }, { status: 400 });
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Revisa el formato del correo." }, { status: 400 });
  }

  if (!isValidRut(rut)) {
    return NextResponse.json({ error: "El RUT ingresado no es válido. Verifica el dígito verificador." }, { status: 400 });
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
