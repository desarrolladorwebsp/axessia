import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readTrackingToken } from "@/lib/public-tracking";
import { readDevQuoteRequests, readDevQuotes, writeDevQuoteRequests, writeDevQuotes, shouldUseJsonStorage } from "@/lib/dev-request-store";
import {
  sendQuoteAcceptedEmail,
  sendInternalQuoteAcceptedNotification,
  sendQuoteRejectedEmail,
  sendInternalQuoteRejectedNotification,
} from "@/lib/services/email";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { token?: unknown; action?: unknown; comment?: unknown };
  const requestNumber = typeof body.token === "string" ? readTrackingToken(body.token) : null;
  const action = body.action === "accept" || body.action === "reject" || body.action === "comment" ? body.action : null;
  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 2000) : "";
  if (!requestNumber || !action) return NextResponse.json({ error: "La acción no es válida." }, { status: 400 });
  if ((action === "reject" || action === "comment") && !comment) return NextResponse.json({ error: action === "reject" ? "El motivo de rechazo es obligatorio." : "Escribe un comentario antes de enviarlo." }, { status: 400 });

  if (shouldUseJsonStorage()) {
    const records = await readDevQuoteRequests();
    const index = records.findIndex((item) => item.requestNumber === requestNumber);
    if (index < 0) return NextResponse.json({ error: "La sesión de seguimiento no es válida." }, { status: 401 });
    const record = records[index];
    if (record.status !== "AWAITING_DECISION") return NextResponse.json({ error: "Esta cotización ya no está disponible para esta acción." }, { status: 409 });
    const updatedAt = new Date().toISOString();
    const nextStatus = action === "comment" ? record.status : action === "accept" ? "ACCEPTED" : "REJECTED";
    records[index] = {
      ...record,
      status: nextStatus,
      updatedAt,
      events: action === "comment" ? record.events : [{ id: `dev-event-${Date.now()}`, status: nextStatus, eventType: action === "accept" ? "QUOTE_ACCEPTED" : "QUOTE_REJECTED", note: comment, createdAt: updatedAt }, ...(record.events ?? [])],
    };
    await writeDevQuoteRequests(records);

    if (action !== "comment") {
      const quotes = await readDevQuotes();
      const quoteIndex = quotes.findIndex((quote) => quote.requestId === record.id && quote.status === "SENT");
      if (quoteIndex >= 0) {
        quotes[quoteIndex] = { ...quotes[quoteIndex], status: action === "accept" ? "ACCEPTED" : "REJECTED" };
        await writeDevQuotes(quotes);
      }
    }

    // Send email notifications (fire-and-forget)
    if (action === "accept") {
      sendQuoteAcceptedEmail(
        record.requesterEmail,
        record.requesterName,
        record.requestNumber,
        `Q-${record.sequence}`,
      );
      sendInternalQuoteAcceptedNotification(
        record.requesterName,
        record.requesterEmail,
        record.requestNumber,
        `Q-${record.sequence}`,
      );
    } else if (action === "reject") {
      sendQuoteRejectedEmail(
        record.requesterEmail,
        record.requesterName,
        record.requestNumber,
        `Q-${record.sequence}`,
        comment,
      );
      sendInternalQuoteRejectedNotification(
        record.requesterName,
        record.requesterEmail,
        record.requestNumber,
        `Q-${record.sequence}`,
        comment,
      );
    }

    return NextResponse.json({ status: records[index].status });
  }

  const record = await prisma.quoteRequest.findUnique({
    where: { requestNumber },
    select: {
      id: true,
      status: true,
      requesterName: true,
      requesterEmail: true,
      quotes: {
        where: { status: "SENT" },
        orderBy: { version: "desc" },
        take: 1,
        select: { id: true, quoteNumber: true, validUntil: true },
      },
    },
  });
  const quote = record?.quotes[0];
  if (!record || !quote || record.status !== "AWAITING_DECISION" || (quote.validUntil && quote.validUntil < new Date())) {
    return NextResponse.json({ error: "Esta cotización ya no está disponible para decisión." }, { status: 409 });
  }

  if (action === "comment") {
    await prisma.$transaction([
      prisma.quoteRequestComment.create({ data: { requestId: record.id, quoteId: quote.id, authorType: "CUSTOMER", message: comment } }),
      prisma.quoteRequestEvent.create({ data: { requestId: record.id, status: record.status, eventType: "CUSTOMER_COMMENT", note: comment } }),
    ]);
    return NextResponse.json({ status: record.status });
  }

  const nextRequestStatus = action === "accept" ? "ACCEPTED" : "REJECTED";
  await prisma.$transaction([
    prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: action === "accept" ? "ACCEPTED" : "REJECTED",
        acceptedAt: action === "accept" ? new Date() : null,
      },
    }),
    prisma.quoteRequest.update({
      where: { id: record.id },
      data: { status: nextRequestStatus },
    }),
    prisma.quoteRequestEvent.create({
      data: {
        requestId: record.id,
        status: nextRequestStatus,
        eventType: action === "accept" ? "QUOTE_ACCEPTED" : "QUOTE_REJECTED",
        note: comment || null,
      },
    }),
    ...(comment
      ? [
          prisma.quoteRequestComment.create({
            data: {
              requestId: record.id,
              quoteId: quote.id,
              authorType: "CUSTOMER",
              message: comment,
            },
          }),
        ]
      : []),
  ]);

  // Send email notifications (fire-and-forget)
  if (action === "accept") {
    sendQuoteAcceptedEmail(
      record.requesterEmail,
      record.requesterName,
      record.id,
      quote.quoteNumber || `Q-${quote.id}`,
    );
    sendInternalQuoteAcceptedNotification(
      record.requesterName,
      record.requesterEmail,
      record.id,
      quote.quoteNumber || `Q-${quote.id}`,
    );
  } else if (action === "reject") {
    sendQuoteRejectedEmail(
      record.requesterEmail,
      record.requesterName,
      record.id,
      quote.quoteNumber || `Q-${quote.id}`,
      comment,
    );
    sendInternalQuoteRejectedNotification(
      record.requesterName,
      record.requesterEmail,
      record.id,
      quote.quoteNumber || `Q-${quote.id}`,
      comment,
    );
  }

  return NextResponse.json({ status: nextRequestStatus });
}
