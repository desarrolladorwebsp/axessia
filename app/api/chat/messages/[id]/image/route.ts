import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { CUSTOMER_SESSION_COOKIE, verifyCustomerSessionToken } from "@/lib/auth";
import { getInternalActor } from "@/lib/internal-access";
import { readStoredFile } from "@/lib/storage/store-file";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await prisma.$queryRaw<Array<{ imageStorageKey: string | null; imageMimeType: string | null; customerId: string | null }>>`SELECT m.imageStorageKey, m.imageMimeType, r.customerId FROM ChatMessage m INNER JOIN QuoteRequest r ON r.id = m.requestId WHERE m.id = ${id} LIMIT 1`;
  const message = rows[0];
  if (!message?.imageStorageKey) return NextResponse.json({ error: "Imagen no encontrada." }, { status: 404 });
  const internalActor = await getInternalActor();
  if (!internalActor) {
    const cookieStore = await cookies();
    const session = verifyCustomerSessionToken(cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value);
    if (!session || session.customerId !== message.customerId) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const buffer = await readStoredFile(message.imageStorageKey);
    return new NextResponse(buffer as BodyInit, { headers: { "Content-Type": message.imageMimeType || "application/octet-stream", "Cache-Control": "private, max-age=300" } });
  } catch {
    return NextResponse.json({ error: "No fue posible leer la imagen." }, { status: 404 });
  }
}
