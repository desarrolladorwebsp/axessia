import { NextRequest, NextResponse } from "next/server";
import { isValidResetTokenFormat, validatePassword } from "@/lib/password";
import { lookupPasswordResetToken, resetPasswordWithToken } from "@/lib/services/password-reset";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";

    if (!token || !isValidResetTokenFormat(token)) {
      return NextResponse.json(
        { valid: false, error: "El enlace de recuperación no es válido. Solicita uno nuevo desde el inicio de sesión." },
        { status: 400 },
      );
    }

    const lookup = await lookupPasswordResetToken(token);

    if (lookup.status !== "valid") {
      const statusCode = lookup.status === "invalid" ? 400 : 410;
      return NextResponse.json({ valid: false, error: lookup.message }, { status: statusCode });
    }

    return NextResponse.json({ valid: true, audience: lookup.audience });
  } catch (error) {
    console.error("Error validating reset token:", error);
    return NextResponse.json(
      { valid: false, error: "No fue posible validar el enlace de recuperación." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      password?: string;
      confirmPassword?: string;
    };

    const token = body.token?.trim() ?? "";
    const password = body.password?.trim() ?? "";
    const confirmPassword = body.confirmPassword?.trim() ?? "";

    if (!token || !password || !confirmPassword) {
      return NextResponse.json({ error: "Completa todos los campos obligatorios." }, { status: 400 });
    }

    if (!isValidResetTokenFormat(token)) {
      return NextResponse.json(
        { error: "El enlace de recuperación no es válido. Solicita uno nuevo desde el inicio de sesión." },
        { status: 400 },
      );
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Las contraseñas no coinciden." }, { status: 400 });
    }

    const result = await resetPasswordWithToken(token, password);

    if (result.status !== "valid") {
      const statusCode = result.status === "invalid" ? 400 : 410;
      return NextResponse.json({ error: result.message }, { status: statusCode });
    }

    return NextResponse.json({
      message: "Tu contraseña fue actualizada correctamente. Ya puedes iniciar sesión.",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json({ error: "No fue posible restablecer la contraseña." }, { status: 500 });
  }
}
