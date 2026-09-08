import { NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/customer-validation";
import { GENERIC_FORGOT_PASSWORD_MESSAGE, requestInternalPasswordReset } from "@/lib/services/password-reset";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = normalizeEmail(body.email ?? "");

    if (!email || !/^[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(email)) {
      return NextResponse.json({ error: "Ingresa un correo electrónico válido." }, { status: 400 });
    }

    try {
      await requestInternalPasswordReset(email);
    } catch (error) {
      console.error("Error sending internal password reset email:", error);
    }

    return NextResponse.json({
      message: GENERIC_FORGOT_PASSWORD_MESSAGE,
    });
  } catch (error) {
    console.error("Error in forgot-password:", error);
    return NextResponse.json({
      message: GENERIC_FORGOT_PASSWORD_MESSAGE,
    });
  }
}
