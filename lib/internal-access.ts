import { cookies } from "next/headers";
import { INTERNAL_SESSION_COOKIE, verifyInternalSessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getInternalActor() {
  const cookieStore = await cookies();
  const session = verifyInternalSessionToken(cookieStore.get(INTERNAL_SESSION_COOKIE)?.value);
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, firstName: true, lastName: true },
  });
}