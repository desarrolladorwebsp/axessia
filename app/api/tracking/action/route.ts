import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readTrackingToken } from "@/lib/public-tracking";
import {
  createProviderReference,
  getActivePaymentForQuote,
  getLatestPaymentForRequest,
  resolveSimulatedPaymentOutcome,
  serializePayment,
} from "@/lib/payments";
import {
  createBanchileSession,
  mapBanchileStatusToPaymentStatus,
  queryBanchileSession,
  type BanchileSessionStatusCode,
} from "@/lib/services/banchile";
import {
  sendQuoteAcceptedEmail,
  sendInternalQuoteAcceptedNotification,
  sendQuoteRejectedEmail,
  sendInternalQuoteRejectedNotification,
  sendPaymentHelpRequestEmail,
} from "@/lib/services/email";

function getAppBaseUrl(): string {
  const configured = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (configured) return (configured.startsWith("http") ? configured : `https://${configured}`).replace(/\/$/, "");
  return "http://localhost:3000";
}

type Action =
  | "accept"
  | "reject"
  | "comment"
  | "start_payment"
  | "confirm_payment"
  | "complete_payment"
  | "advance_without_payment"
  | "payment_help";

type Body = {
  token?: unknown;
  action?: unknown;
  comment?: unknown;
  outcome?: unknown;
  paymentId?: unknown;
  message?: unknown;
};

function invalid(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function parseAction(value: unknown): Action | null {
  if (
    value === "accept" ||
    value === "reject" ||
    value === "comment" ||
    value === "start_payment" ||
    value === "confirm_payment" ||
    value === "complete_payment" ||
    value === "advance_without_payment" ||
    value === "payment_help"
  ) {
    return value;
  }
  return null;
}

async function loadAuthorizedRequest(requestNumber: string) {
  return prisma.quoteRequest.findUnique({
    where: { requestNumber },
    select: {
      id: true,
      requestNumber: true,
      status: true,
      requesterName: true,
      requesterEmail: true,
      quotes: {
        orderBy: { version: "desc" },
        take: 5,
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          total: true,
          validUntil: true,
          version: true,
        },
      },
    },
  });
}

function pickDecisionQuote<T extends { status: string; validUntil: Date | null }>(quotes: T[]) {
  return quotes.find((quote) => quote.status === "SENT") ?? null;
}

function pickAcceptedQuote<T extends { status: string }>(quotes: T[]) {
  return quotes.find((quote) => quote.status === "ACCEPTED") ?? null;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Body;
  const requestNumber = typeof body.token === "string" ? readTrackingToken(body.token) : null;
  const action = parseAction(body.action);
  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 2000) : "";
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
  const paymentId = typeof body.paymentId === "string" ? body.paymentId.trim() : "";
  const outcome =
    body.outcome === "success" || body.outcome === "failure" || body.outcome === "cancel"
      ? body.outcome
      : null;

  if (!requestNumber || !action) return invalid("La acción no es válida.");

  const record = await loadAuthorizedRequest(requestNumber);
  if (!record?.requestNumber) return NextResponse.json({ error: "La sesión de seguimiento no es válida." }, { status: 401 });

  if (action === "comment") {
    if (!comment) return invalid("Escribe un comentario antes de enviarlo.");
    const quote = pickDecisionQuote(record.quotes) ?? pickAcceptedQuote(record.quotes);
    await prisma.$transaction([
      prisma.quoteRequestComment.create({
        data: {
          requestId: record.id,
          quoteId: quote?.id,
          authorType: "CUSTOMER",
          message: comment,
        },
      }),
      prisma.quoteRequestEvent.create({
        data: {
          requestId: record.id,
          status: record.status,
          eventType: "CUSTOMER_COMMENT",
          note: comment,
        },
      }),
    ]);
    return NextResponse.json({ status: record.status });
  }

  if (action === "accept" || action === "reject") {
    if (action === "reject" && !comment) return invalid("El motivo de rechazo es obligatorio.");
    const quote = pickDecisionQuote(record.quotes);
    if (!quote || record.status !== "AWAITING_DECISION") {
      return invalid("Esta cotización ya no está disponible para decisión.", 409);
    }
    if (quote.validUntil && quote.validUntil < new Date()) {
      await prisma.$transaction([
        prisma.quote.update({ where: { id: quote.id }, data: { status: "EXPIRED" } }),
        prisma.quoteRequestEvent.create({
          data: {
            requestId: record.id,
            status: record.status,
            eventType: "QUOTE_EXPIRED",
            note: "El cliente intentó responder una cotización vencida.",
          },
        }),
      ]);
      return invalid("Esta cotización ya no está vigente.", 409);
    }

    const nextRequestStatus = action === "accept" ? "ACCEPTED" : "REJECTED";
    const now = new Date();

    await prisma.$transaction([
      prisma.quote.update({
        where: { id: quote.id },
        data: {
          status: action === "accept" ? "ACCEPTED" : "REJECTED",
          acceptedAt: action === "accept" ? now : null,
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
      prisma.notification.create({
        data: { requestId: record.id, type: action === "accept" ? "QUOTE_ACCEPTED" : "QUOTE_REJECTED" },
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

    const quoteNumber = quote.quoteNumber || `C-${quote.version}`;
    if (action === "accept") {
      void sendQuoteAcceptedEmail(record.requesterEmail, record.requesterName, record.requestNumber, quoteNumber);
      void sendInternalQuoteAcceptedNotification(record.requesterName, record.requesterEmail, record.requestNumber, quoteNumber);
    } else {
      void sendQuoteRejectedEmail(record.requesterEmail, record.requesterName, record.requestNumber, quoteNumber, comment);
      void sendInternalQuoteRejectedNotification(record.requesterName, record.requesterEmail, record.requestNumber, quoteNumber, comment);
    }

    return NextResponse.json({
      status: nextRequestStatus,
      quoteStatus: action === "accept" ? "ACCEPTED" : "REJECTED",
      canContinueAfterAccept: action === "accept",
      canPay: action === "accept",
      canAdvanceWithoutPayment: action === "accept",
    });
  }

  const acceptedQuote = pickAcceptedQuote(record.quotes);
  if (!acceptedQuote || record.status !== "ACCEPTED") {
    return invalid("La cotización debe estar aceptada para continuar con el pago o el avance.", 409);
  }

  if (action === "advance_without_payment") {
    const latestPayment = await getLatestPaymentForRequest(record.id);
    if (latestPayment?.status === "PAID") {
      return NextResponse.json({
        status: record.status,
        payment: serializePayment(latestPayment),
        message: "El pago ya está confirmado. El equipo AXESSIA continuará la gestión.",
      });
    }

    const existingAdvance = await prisma.quoteRequestEvent.findFirst({
      where: { requestId: record.id, eventType: "ADVANCE_WITHOUT_PAYMENT" },
      orderBy: { createdAt: "desc" },
    });
    if (existingAdvance) {
      return NextResponse.json({
        status: record.status,
        payment: latestPayment ? serializePayment(latestPayment) : null,
        message: "Ya registraste que deseas avanzar sin pago inmediato.",
      });
    }

    await prisma.quoteRequestEvent.create({
      data: {
        requestId: record.id,
        status: record.status,
        eventType: "ADVANCE_WITHOUT_PAYMENT",
        note: comment || "El cliente eligió continuar el proceso sin pagar ahora.",
      },
    });

    return NextResponse.json({
      status: record.status,
      payment: latestPayment ? serializePayment(latestPayment) : null,
      message: "Registramos que deseas continuar sin pagar ahora. AXESSIA te contactará para coordinar los siguientes pasos.",
    });
  }

  if (action === "start_payment") {
    const latestPaid = await prisma.payment.findFirst({
      where: { requestId: record.id, status: "PAID" },
      orderBy: { createdAt: "desc" },
    });
    if (latestPaid) {
      return NextResponse.json({
        status: record.status,
        payment: serializePayment(latestPaid),
        message: "El pago ya fue confirmado.",
      });
    }

    const active = await getActivePaymentForQuote(acceptedQuote.id);
    if (active) {
      // A Banchile session is already in flight: re-check its real status before resuming.
      if (active.provider === "BANCHILE" && active.providerReference) {
        try {
          const session = await queryBanchileSession(active.providerReference);
          const nextStatus = mapBanchileStatusToPaymentStatus(session.status.status as BanchileSessionStatusCode);
          if (nextStatus !== "PROCESSING") {
            const now = new Date();
            const resolved = await prisma.$transaction(async (tx) => {
              const next = await tx.payment.update({
                where: { id: active.id },
                data: {
                  status: nextStatus,
                  paidAt: nextStatus === "PAID" ? now : null,
                  failedAt: nextStatus === "FAILED" ? now : null,
                  failureReason: nextStatus === "FAILED" ? (session.status.message || "El pago fue rechazado por Banchile Pagos.") : null,
                },
              });
              await tx.quoteRequestEvent.create({
                data: {
                  requestId: record.id,
                  status: record.status,
                  eventType: nextStatus === "PAID" ? "PAYMENT_CONFIRMED" : "PAYMENT_FAILED",
                  note: nextStatus === "PAID" ? "Pago confirmado por Banchile Pagos." : session.status.message || "El pago fue rechazado por Banchile Pagos.",
                },
              });
              return next;
            });
            return NextResponse.json({
              status: record.status,
              payment: serializePayment(resolved),
              message: resolved.status === "PAID" ? "El pago ya fue confirmado." : "El pago anterior fue rechazado. Puedes iniciar un nuevo intento.",
            });
          }
        } catch {
          // If Banchile can't be reached, fall through and let the customer resume the existing checkout.
        }

        const refreshed = active.status === "PENDING" ? await prisma.payment.update({ where: { id: active.id }, data: { status: "PROCESSING" } }) : active;
        return NextResponse.json({
          status: record.status,
          payment: serializePayment(refreshed),
          checkoutUrl: refreshed.checkoutUrl,
          message: "Continúa el intento de pago en curso.",
        });
      }

      const refreshed =
        active.status === "PENDING"
          ? await prisma.payment.update({
              where: { id: active.id },
              data: { status: "PROCESSING" },
            })
          : active;

      return NextResponse.json({
        status: record.status,
        payment: serializePayment(refreshed),
        message: "Continúa el intento de pago en curso.",
      });
    }

    if (!acceptedQuote.total) return invalid("La cotización no tiene un total válido para pagar.", 409);
    const amountTotal = Math.round(Number(acceptedQuote.total));
    if (!Number.isFinite(amountTotal) || amountTotal <= 0) return invalid("Monto inválido para iniciar el pago.", 409);

    const created = await prisma.payment.create({
      data: {
        requestId: record.id,
        quoteId: acceptedQuote.id,
        amount: acceptedQuote.total,
        currency: "CLP",
        status: "PENDING",
        provider: "BANCHILE",
      },
    });

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "AXESSIA Tracking";
    const returnUrl = `${getAppBaseUrl()}/seguimiento/${encodeURIComponent(record.requestNumber)}?payment=return`;

    let session;
    try {
      session = await createBanchileSession({
        reference: created.id,
        description: `Cotización ${acceptedQuote.quoteNumber || `v${acceptedQuote.version}`} - Solicitud ${record.requestNumber}`,
        amountTotal,
        returnUrl,
        ipAddress,
        userAgent,
      });
    } catch (banchileError) {
      console.error("Error creating Banchile Pagos session:", banchileError);
      await prisma.payment.update({
        where: { id: created.id },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          failureReason: banchileError instanceof Error ? banchileError.message : "No fue posible iniciar el pago con Banchile Pagos.",
        },
      });
      return invalid("No fue posible iniciar el pago con Banchile Pagos. Intenta nuevamente.", 502);
    }

    const payment = await prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: created.id },
        data: { providerReference: String(session.requestId), checkoutUrl: session.processUrl },
      });
      await tx.quoteRequestEvent.create({
        data: {
          requestId: record.id,
          status: record.status,
          eventType: "PAYMENT_STARTED",
          note: `Inicio de pago Banchile Pagos (sesión ${updated.providerReference}).`,
        },
      });
      return updated;
    });

    return NextResponse.json({
      status: record.status,
      payment: serializePayment(payment),
      checkoutUrl: session.processUrl,
      message: "Se inició el proceso de pago. Serás redirigido al Web Checkout de Banchile Pagos.",
    });
  }

  if (action === "confirm_payment") {
    const payment = paymentId
      ? await prisma.payment.findFirst({ where: { id: paymentId, requestId: record.id, quoteId: acceptedQuote.id } })
      : await getActivePaymentForQuote(acceptedQuote.id) ?? (await getLatestPaymentForRequest(record.id));

    if (!payment) return invalid("No encontramos un intento de pago para confirmar.", 404);

    if (payment.provider !== "BANCHILE" || !payment.providerReference) {
      return NextResponse.json({ status: record.status, payment: serializePayment(payment), message: "Este intento de pago no admite confirmación automática." });
    }
    if (["PAID", "FAILED", "CANCELLED"].includes(payment.status)) {
      return NextResponse.json({
        status: record.status,
        payment: serializePayment(payment),
        message: payment.status === "PAID" ? "El pago ya está confirmado." : "Este intento de pago ya fue resuelto.",
      });
    }

    let session;
    try {
      session = await queryBanchileSession(payment.providerReference);
    } catch (queryError) {
      return invalid(queryError instanceof Error ? queryError.message : "No fue posible consultar el estado del pago.", 502);
    }

    const nextStatus = mapBanchileStatusToPaymentStatus(session.status.status as BanchileSessionStatusCode);
    if (nextStatus === "PROCESSING") {
      const refreshed = payment.status === "PENDING" ? await prisma.payment.update({ where: { id: payment.id }, data: { status: "PROCESSING" } }) : payment;
      return NextResponse.json({
        status: record.status,
        payment: serializePayment(refreshed),
        checkoutUrl: refreshed.checkoutUrl ?? session.processUrl,
        message: "El pago aún está pendiente de confirmación por Banchile Pagos.",
      });
    }

    const now = new Date();
    const transaction = session.payment[0];
    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: nextStatus,
          paidAt: nextStatus === "PAID" ? now : null,
          failedAt: nextStatus === "FAILED" ? now : null,
          failureReason: nextStatus === "FAILED" ? (session.status.message || "El pago fue rechazado por Banchile Pagos.") : null,
        },
      });
      await tx.quoteRequestEvent.create({
        data: {
          requestId: record.id,
          status: record.status,
          eventType: nextStatus === "PAID" ? "PAYMENT_CONFIRMED" : "PAYMENT_FAILED",
          note:
            nextStatus === "PAID"
              ? `Pago confirmado por Banchile Pagos (${transaction?.authorization ?? payment.providerReference}).`
              : session.status.message || "El pago fue rechazado por Banchile Pagos.",
        },
      });
      return next;
    });

    return NextResponse.json({
      status: record.status,
      payment: serializePayment(updated),
      message: updated.status === "PAID" ? "Pago confirmado correctamente." : "El pago fue rechazado. Puedes reintentar o solicitar ayuda a AXESSIA.",
    });
  }

  if (action === "complete_payment") {
    if (!paymentId) return invalid("Falta el identificador del pago.");
    if (!outcome) return invalid("Indica el resultado del pago.");

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, requestId: record.id, quoteId: acceptedQuote.id },
    });
    if (!payment) return invalid("No encontramos ese intento de pago.", 404);

    if (payment.status === "PAID") {
      return NextResponse.json({
        status: record.status,
        payment: serializePayment(payment),
        message: "El pago ya estaba confirmado.",
      });
    }

    // Only an in-flight attempt can be resolved by the gateway callback/simulator.
    // Retries after FAILED/CANCELLED/HELP_REQUESTED must start a new payment attempt.
    if (!["PENDING", "PROCESSING"].includes(payment.status)) {
      return invalid("Este intento de pago ya no admite una nueva resolución. Inicia un reintento.", 409);
    }

    const resolved = resolveSimulatedPaymentOutcome(outcome);
    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: resolved.status,
          failureReason: resolved.failureReason,
          paidAt: resolved.status === "PAID" ? now : null,
          failedAt: resolved.status === "FAILED" || resolved.status === "CANCELLED" ? now : null,
        },
      });
      await tx.quoteRequestEvent.create({
        data: {
          requestId: record.id,
          status: record.status,
          eventType: resolved.eventType,
          note:
            resolved.status === "PAID"
              ? `Pago confirmado por pasarela (${next.providerReference}).`
              : resolved.failureReason,
        },
      });
      return next;
    });

    return NextResponse.json({
      status: record.status,
      payment: serializePayment(updated),
      message:
        updated.status === "PAID"
          ? "Pago confirmado correctamente."
          : updated.status === "CANCELLED"
            ? "Cancelaste el intento de pago. Puedes reintentar cuando quieras."
            : "El pago fue rechazado. Puedes reintentar o solicitar ayuda a AXESSIA.",
    });
  }

  if (action === "payment_help") {
    if (!message) return invalid("Describe el problema con el pago para que AXESSIA pueda ayudarte.");

    let payment = paymentId
      ? await prisma.payment.findFirst({ where: { id: paymentId, requestId: record.id } })
      : await getLatestPaymentForRequest(record.id);

    if (!payment) {
      if (!acceptedQuote.total) return invalid("No hay un intento de pago asociado para solicitar ayuda.", 409);
      payment = await prisma.payment.create({
        data: {
          requestId: record.id,
          quoteId: acceptedQuote.id,
          amount: acceptedQuote.total,
          currency: "CLP",
          status: "HELP_REQUESTED",
          provider: "SIMULATED",
          providerReference: createProviderReference(record.id),
          helpMessage: message,
          failureReason: "El cliente solicitó ayuda antes de completar un pago.",
        },
      });
    } else if (payment.status !== "PAID") {
      payment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "HELP_REQUESTED",
          helpMessage: message,
        },
      });
    }

    await prisma.$transaction([
      prisma.quoteRequestComment.create({
        data: {
          requestId: record.id,
          quoteId: acceptedQuote.id,
          authorType: "CUSTOMER",
          message: `Ayuda con pago: ${message}`,
        },
      }),
      prisma.quoteRequestEvent.create({
        data: {
          requestId: record.id,
          status: record.status,
          eventType: "PAYMENT_HELP_REQUESTED",
          note: message,
        },
      }),
    ]);

    void sendPaymentHelpRequestEmail({
      customerName: record.requesterName,
      customerEmail: record.requesterEmail,
      requestNumber: record.requestNumber,
      quoteNumber: acceptedQuote.quoteNumber || `C-${acceptedQuote.version}`,
      paymentReference: payment.providerReference,
      message,
    });

    return NextResponse.json({
      status: record.status,
      payment: serializePayment(payment),
      message: "Tu solicitud de ayuda fue enviada al equipo AXESSIA. Mantienes tu cotización aceptada y puedes reintentar el pago.",
    });
  }

  return invalid("La acción no es válida.");
}
