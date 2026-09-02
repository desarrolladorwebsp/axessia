import { NextRequest, NextResponse } from "next/server";
import { sendContactMessageEmail } from "@/lib/services/email";

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export async function POST(request: NextRequest) {
  let body: { name?: string; email?: string; phone?: string; subject?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const subject = body.subject?.trim() ?? "";
  const message = body.message?.trim() ?? "";

  if (!name || !email || !phone || !subject || !message) {
    return NextResponse.json({ error: "Completa todos los campos obligatorios." }, { status: 400 });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Revisa el formato del correo." }, { status: 400 });
  }

  try {
    await sendContactMessageEmail({ name, email, phone, subject, message });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Contact] Failed to send contact message:", error);
    return NextResponse.json({ error: "No fue posible enviar tu mensaje. Intenta nuevamente." }, { status: 502 });
  }
}
