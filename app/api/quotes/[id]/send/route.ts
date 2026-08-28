import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readDevQuotes, writeDevQuotes, shouldUseJsonStorage } from "@/lib/dev-request-store";
import { sendQuoteReadyEmail } from "@/lib/services/email";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Marks a quote as sent and notifies the customer. Awaits the email so failures
// can be reported back and retried without recreating the quote.
export async function POST(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  try {
    if (shouldUseJsonStorage()) {
      const quotes = await readDevQuotes();
      const index = quotes.findIndex((quote) => quote.id === id);
      if (index === -1) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
      const quote = quotes[index];

      try {
        await sendQuoteReadyEmail(quote.customer.email, quote.customer.name, quote.request.requestNumber || quote.quoteNumber, quote.quoteNumber, quote.total, quote.validUntil);
      } catch (emailError) {
        console.error("Error sending quote-ready email:", emailError);
        return NextResponse.json({ error: "No fue posible enviar la cotización al cliente. Intenta nuevamente." }, { status: 502 });
      }

      const now = new Date().toISOString();
      quotes[index] = { ...quote, status: "SENT", sentAt: now };
      await writeDevQuotes(quotes);
      return NextResponse.json(quotes[index]);
    }

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: { customer: { select: { email: true, name: true } }, request: { select: { requestNumber: true } } },
    });
    if (!quote) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });

    try {
      await sendQuoteReadyEmail(
        quote.customer.email,
        quote.customer.name,
        quote.request.requestNumber || quote.quoteNumber || "",
        quote.quoteNumber || `Borrador v${quote.version}`,
        quote.total?.toString() ?? null,
        quote.validUntil?.toISOString() ?? null,
      );
    } catch (emailError) {
      console.error("Error sending quote-ready email:", emailError);
      return NextResponse.json({ error: "No fue posible enviar la cotización al cliente. Intenta nuevamente." }, { status: 502 });
    }

    const updated = await prisma.quote.update({ where: { id }, data: { status: "SENT", sentAt: new Date() } });
    return NextResponse.json({
      ...updated,
      total: updated.total?.toString() ?? null,
      validUntil: updated.validUntil?.toISOString() ?? null,
      sentAt: updated.sentAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error sending quote:", error);
    return NextResponse.json({ error: "No fue posible enviar la cotización" }, { status: 500 });
  }
}
