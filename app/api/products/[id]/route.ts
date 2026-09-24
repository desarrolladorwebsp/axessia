import { NextRequest, NextResponse } from "next/server";
import { getInternalActor } from "@/lib/internal-access";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getInternalActor()) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;
  const cost = typeof body.cost === "number" ? body.cost : Number(body.cost);
  const name = typeof body.productName === "string" ? body.productName.trim().slice(0, 191) : "";
  if (!name || !Number.isFinite(cost) || cost < 0) return NextResponse.json({ error: "Nombre y costo son obligatorios." }, { status: 400 });
  await prisma.$executeRaw`UPDATE Product SET productName = ${name}, cost = ${cost.toFixed(2)}, updatedAt = NOW(3) WHERE id = ${id} AND isActive = true`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getInternalActor()) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { id } = await params;
  await prisma.$executeRaw`UPDATE Product SET isActive = false, updatedAt = NOW(3) WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
