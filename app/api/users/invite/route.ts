import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { INTERNAL_SESSION_COOKIE, verifyInternalSessionToken } from "@/lib/auth";
import { isValidRut, normalizeEmail, normalizeRut } from "@/lib/customer-validation";
import { prisma } from "@/lib/prisma";
import { sendEmailAwaited } from "@/lib/services/email";

function buildInvitationEmail({ fullName, invitationUrl }: { fullName: string; invitationUrl: string }) {
  const brandName = "AXESSIA";

  return `
    <!doctype html>
    <html lang="es">
      <body style="margin:0;padding:0;background:#F7F9FC;font-family:Arial,sans-serif;color:#071E41;">
        <div style="max-width:640px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;border:1px solid #DCE4ED;">
          <div style="padding:28px 32px;background:linear-gradient(90deg,#00A6D9 0%,#087FD5 45%,#7A28D8 100%);color:#fff;">
            <div style="font-size:26px;font-weight:700;letter-spacing:-0.04em;">${brandName}</div>
            <div style="margin-top:10px;font-size:14px;opacity:0.9;">Invitación para completar tu registro</div>
          </div>
          <div style="padding:32px;">
            <h2 style="margin:0 0 16px;font-size:24px;color:#071E41;">Hola ${fullName},</h2>
            <p style="margin:0 0 24px;line-height:1.7;color:#4F5F73;">
              Has sido invitado(a) a formar parte del equipo de AXESSIA. Para completar tu registro
              interno y acceder al sistema, haz clic en el siguiente botón.
            </p>
            <div style="margin:24px 0; text-align:center;">
              <a href="${invitationUrl}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:linear-gradient(90deg,#00A6D9 0%,#087FD5 45%,#7A28D8 100%);color:#fff;text-decoration:none;font-weight:700;">Completar mi registro</a>
            </div>
            <p style="margin:0;line-height:1.7;color:#4F5F73;">
              Este enlace es de uso único y vence en 7 días. Si no puedes usarlo, solicita una nueva invitación desde el panel administrativo.
            </p>
          </div>
          <div style="padding:20px 32px 30px;font-size:12px;color:#4F5F73;background:#F7F9FC;border-top:1px solid #DCE4ED;">
            AXESSIA • Sistema interno de gestión
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(INTERNAL_SESSION_COOKIE)?.value;
    const session = verifyInternalSessionToken(sessionToken);

    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const actor = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true },
    });

    if (!actor || actor.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No tienes permisos para invitar usuarios internos." }, { status: 403 });
    }

    const body = (await request.json()) as { email?: string; rut?: string; role?: string };
    const email = normalizeEmail(body.email ?? "");
    const rut = normalizeRut(body.rut ?? "");
    const role = body.role ?? "EJECUTIVO";

    if (!email || !rut || !role) {
      return NextResponse.json({ error: "Correo, RUT y rol son obligatorios." }, { status: 400 });
    }

    if (!/^[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(email)) {
      return NextResponse.json({ error: "El correo ingresado no tiene un formato válido." }, { status: 400 });
    }

    if (!isValidRut(rut)) {
      return NextResponse.json({ error: "El RUT ingresado no es válido." }, { status: 400 });
    }

    if (!['EJECUTIVO', 'ADMINISTRADOR'].includes(role)) {
      return NextResponse.json({ error: "El rol indicado no es válido." }, { status: 400 });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { rut }] },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Ya existe un usuario con este correo o RUT." }, { status: 409 });
    }

    const pendingInvitation = await prisma.internalUserInvitation.findFirst({
      where: {
        OR: [{ email }, { rut }],
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      select: { id: true, email: true },
    });

    if (pendingInvitation) {
      return NextResponse.json({ error: "Ya existe una invitación pendiente para este correo o RUT." }, { status: 409 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    const baseUrl = process.env.APP_URL ?? "https://axessia.cl";
    const invitationUrl = `${baseUrl}/invitacion/${token}`;

    const invitation = await prisma.internalUserInvitation.create({
      data: {
        email,
        rut,
        role: role as "EJECUTIVO" | "ADMINISTRADOR",
        token,
        expiresAt,
        invitedById: actor.id,
        sentAt: new Date(),
      },
      select: { id: true, email: true, rut: true, role: true },
    });

    const fullName = email.split("@")[0];
    await sendEmailAwaited({
      to: invitation.email,
      subject: "Invitación para completar tu registro en AXESSIA",
      html: buildInvitationEmail({ fullName: fullName || "Usuario", invitationUrl }),
    });

    return NextResponse.json({
      message: "Invitación enviada correctamente.",
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating internal invitation:", error);
    return NextResponse.json({ error: "No fue posible enviar la invitación." }, { status: 500 });
  }
}
