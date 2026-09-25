import { cookies } from "next/headers";
import { INTERNAL_SESSION_COOKIE, verifyInternalSessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getInternalActor() {
  const cookieStore = await cookies();
  const session = verifyInternalSessionToken(cookieStore.get(INTERNAL_SESSION_COOKIE)?.value);
  if (!session) return null;

  try {
    return await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, firstName: true, lastName: true },
    });
  } catch (error) {
    // Una caída puntual de la base no debe romper la ruta: se trata como sesión no verificable.
    console.error("No fue posible verificar la sesión interna:", error);
    return null;
  }
}