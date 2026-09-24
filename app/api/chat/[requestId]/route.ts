import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { CUSTOMER_SESSION_COOKIE, verifyCustomerSessionToken } from "@/lib/auth";
import { getInternalActor } from "@/lib/internal-access";
import { deleteStoredFile, readStoredFile, saveStoredFile } from "@/lib/storage/store-file";
import { validateUploadFile } from "@/lib/storage/validation";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function authorize(requestId: string) {
  const internalActor = await getInternalActor();
  if (internalActor) return { authorType: "TEAM" as const, customerId: null };
  const cookieStore = await cookies();
  const session = verifyCustomerSessionToken(cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value);
  if (!session) return null;
  const owned = await prisma.quoteRequest.findFirst({ where: { id: requestId, customerId: session.customerId }, select: { id: true } });
  return owned ? { authorType: "CUSTOMER" as const, customerId: session.customerId } : null;
}

function serialize(message: { id: string; authorType: string; message: string; imageFileName: string | null; imageMimeType: string | null; createdAt: Date }) {
  return { ...message, senderLabel: message.authorType === "TEAM" ? "Team AXESSIA" : "Tú", imageUrl: message.imageFileName ? `/api/chat/messages/${message.id}/image` : null };
}

type ChatRow = { id: string; authorType: string; message: string; imageFileName: string | null; imageMimeType: string | null; createdAt: Date };

export async function GET(_request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  if (!await authorize(requestId)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const messages = await prisma.$queryRaw<ChatRow[]>`SELECT id, authorType, message, imageFileName, imageMimeType, createdAt FROM ChatMessage WHERE requestId = ${requestId} ORDER BY createdAt ASC`;
  return NextResponse.json({ messages: messages.map(serialize) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const actor = await authorize(requestId);
  if (!actor) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const form = await request.formData();
  const message = typeof form.get("message") === "string" ? String(form.get("message")).trim() : "";
  const image = form.get("image");
  if (!message && !(image instanceof File)) return NextResponse.json({ error: "Escribe un mensaje o adjunta una imagen." }, { status: 400 });
  if (message.length > MAX_MESSAGE_LENGTH) return NextResponse.json({ error: `El mensaje no puede superar los ${MAX_MESSAGE_LENGTH} caracteres.` }, { status: 400 });

  let imageStorageKey: string | null = null;
  let imageFileName: string | null = null;
  let imageMimeType: string | null = null;
  let imageFileSize: number | null = null;
  try {
    if (image instanceof File) {
      if (image.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "La imagen no puede superar los 5 MB." }, { status: 400 });
      const buffer = Buffer.from(await image.arrayBuffer());
      const validation = validateUploadFile({ buffer, mimeType: image.type, extension: image.name.split(".").pop() ?? "", size: image.size });
      if (!validation.ok || !IMAGE_TYPES.has(validation.mimeType)) return NextResponse.json({ error: "Solo se permiten imágenes JPG, PNG o WEBP válidas." }, { status: 400 });
      imageStorageKey = await saveStoredFile("chat-images", requestId, buffer, validation.extension);
      imageFileName = image.name.replace(/[^\w. ()-]/g, "_").slice(0, 120);
      imageMimeType = validation.mimeType;
      imageFileSize = buffer.length;
    }
    const id = crypto.randomUUID();
    await prisma.$executeRaw`INSERT INTO ChatMessage (id, requestId, authorType, message, imageStorageKey, imageFileName, imageMimeType, imageFileSize) VALUES (${id}, ${requestId}, ${actor.authorType}, ${message}, ${imageStorageKey}, ${imageFileName}, ${imageMimeType}, ${imageFileSize})`;
    const created = (await prisma.$queryRaw<ChatRow[]>`SELECT id, authorType, message, imageFileName, imageMimeType, createdAt FROM ChatMessage WHERE id = ${id} LIMIT 1`)[0];
    if (!created) throw new Error("Mensaje no creado");
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error) {
    if (imageStorageKey) await deleteStoredFile(imageStorageKey);
    console.error("Chat message error:", error);
    return NextResponse.json({ error: "No fue posible enviar el mensaje." }, { status: 500 });
  }
}
