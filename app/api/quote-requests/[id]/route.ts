import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readDevQuoteRequests, shouldUseJsonStorage } from "@/lib/dev-request-store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  try {
    if (shouldUseJsonStorage()) {
      const request = (await readDevQuoteRequests()).find((record) => record.id === id);

      if (!request) {
        return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
      }

      return NextResponse.json(request);
    }

    const request = await prisma.quoteRequest.findUnique({
      where: { id },
      include: {
        customer: true,
        prescription: true,
        medications: true,
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    return NextResponse.json(request);
  } catch (error) {
    console.error("Error fetching request detail:", error);
    return NextResponse.json({ error: "Error al obtener la solicitud" }, { status: 500 });
  }
}