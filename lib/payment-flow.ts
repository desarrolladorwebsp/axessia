import type { Payment, Prisma, QuoteRequestStatus } from "@prisma/client";
import { DomainError } from "@/lib/domain-error";
import {
  createProviderReference,
  getActivePaymentForQuote,
  getLatestPaymentForRequest,
  payableAmountFromQuoteTotal,
  resolveSimulatedPaymentOutcome,
  serializePayment,
} from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import {
  createBanchileSession,
  mapBanchileStatusToPaymentStatus,
  queryBanchileSession,
  type BanchileSessionStatusCode,
} from "@/lib/services/banchile";
import { sendPaymentHelpRequestEmail } from "@/lib/services/email";

type PaymentRequest = {
  id: string;
  requestNumber: string | null;
  status: QuoteRequestStatus;
  requesterName: string;
  requesterEmail: string;
};

type PaymentQuote = {
  id: string;
  quoteNumber: string | null;
  version: number;
  status: string;
  total: Prisma.Decimal | number | string | null;
};

function requireRequestNumber(request: PaymentRequest) {
  if (!request.requestNumber) {
    throw new DomainError("La solicitud no tiene un identificador público válido.", 409);
  }
  return request.requestNumber;
}

function requireAcceptedContext(request: PaymentRequest, quote: PaymentQuote | null) {
  if (!quote || quote.status !== "ACCEPTED" || request.status !== "ACCEPTED") {
    throw new DomainError("La cotización debe estar aceptada para continuar con el pago o el avance.", 409);
  }
  return quote;
}

function quoteAmount(quote: PaymentQuote) {
  if (quote.total === null) {
    throw new DomainError("La cotización no tiene un total válido para pagar.", 409);
  }
  const payable = payableAmountFromQuoteTotal(quote.total);
  if (!payable) {
    throw new DomainError("Monto inválido para iniciar el pago.", 409);
  }
  return { amount: quote.total, amountTotal: payable.amountTotal };
}

export async function advanceWithoutPayment(request: PaymentRequest, quote: PaymentQuote | null) {
  const acceptedQuote = requireAcceptedContext(request, quote);
  void acceptedQuote;
  const latestPayment = await getLatestPaymentForRequest(request.id);
  if (latestPayment?.status === "PAID") {
    return {
      status: request.status,
      payment: serializePayment(latestPayment),
      message: "El pago ya está confirmado. El equipo AXESSIA continuará la gestión.",
    };
  }

  const existingAdvance = await prisma.quoteRequestEvent.findFirst({
    where: { requestId: request.id, eventType: "ADVANCE_WITHOUT_PAYMENT" },
    orderBy: { createdAt: "desc" },
  });
  if (existingAdvance) {
    return {
      status: request.status,
      payment: latestPayment ? serializePayment(latestPayment) : null,
      message: "Ya registraste que deseas avanzar sin pago inmediato.",
    };
  }

  await prisma.quoteRequestEvent.create({
    data: {
      requestId: request.id,
      status: request.status,
      eventType: "ADVANCE_WITHOUT_PAYMENT",
      note: "El cliente eligió continuar el proceso sin pagar ahora.",
    },
  });

  return {
    status: request.status,
    payment: latestPayment ? serializePayment(latestPayment) : null,
    message: "Registramos que deseas continuar sin pagar ahora. AXESSIA te contactará para coordinar los siguientes pasos.",
  };
}

export async function startPayment(input: {
  request: PaymentRequest;
  quote: PaymentQuote | null;
  ipAddress: string;
  userAgent: string;
  returnUrl: string;
}) {
  const acceptedQuote = requireAcceptedContext(input.request, input.quote);
  const requestNumber = requireRequestNumber(input.request);

  const latestPaid = await prisma.payment.findFirst({
    where: { requestId: input.request.id, status: "PAID" },
    orderBy: { createdAt: "desc" },
  });
  if (latestPaid) {
    return {
      status: input.request.status,
      payment: serializePayment(latestPaid),
      message: "El pago ya fue confirmado.",
    };
  }

  const active = await getActivePaymentForQuote(acceptedQuote.id);
  if (active) {
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
                requestId: input.request.id,
                status: input.request.status,
                eventType: nextStatus === "PAID" ? "PAYMENT_CONFIRMED" : "PAYMENT_FAILED",
                note: nextStatus === "PAID" ? "Pago confirmado por Banchile Pagos." : session.status.message || "El pago fue rechazado por Banchile Pagos.",
              },
            });
            return next;
          });
          return {
            status: input.request.status,
            payment: serializePayment(resolved),
            message: resolved.status === "PAID" ? "El pago ya fue confirmado." : "El pago anterior fue rechazado. Puedes iniciar un nuevo intento.",
          };
        }
      } catch {
        // If Banchile can't be reached, fall through and let the customer resume the existing checkout.
      }

      const refreshed = active.status === "PENDING" ? await prisma.payment.update({ where: { id: active.id }, data: { status: "PROCESSING" } }) : active;
      return {
        status: input.request.status,
        payment: serializePayment(refreshed),
        checkoutUrl: refreshed.checkoutUrl,
        message: "Continúa el intento de pago en curso.",
      };
    }

    const refreshed =
      active.status === "PENDING"
        ? await prisma.payment.update({
            where: { id: active.id },
            data: { status: "PROCESSING" },
          })
        : active;

    return {
      status: input.request.status,
      payment: serializePayment(refreshed),
      message: "Continúa el intento de pago en curso.",
    };
  }

  const { amount, amountTotal } = quoteAmount(acceptedQuote);
  const created = await prisma.payment.create({
    data: {
      requestId: input.request.id,
      quoteId: acceptedQuote.id,
      amount,
      currency: "CLP",
      status: "PENDING",
      provider: "BANCHILE",
    },
  });

  let session;
  try {
    session = await createBanchileSession({
      reference: created.id,
      description: `Cotización ${acceptedQuote.quoteNumber || `v${acceptedQuote.version}`} - Solicitud ${requestNumber}`,
      amountTotal,
      returnUrl: input.returnUrl,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
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
    throw new DomainError("No fue posible iniciar el pago con Banchile Pagos. Intenta nuevamente.", 502);
  }

  const payment = await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id: created.id },
      data: { providerReference: String(session.requestId), checkoutUrl: session.processUrl },
    });
    await tx.quoteRequestEvent.create({
      data: {
        requestId: input.request.id,
        status: input.request.status,
        eventType: "PAYMENT_STARTED",
        note: `Inicio de pago Banchile Pagos (sesión ${updated.providerReference}).`,
      },
    });
    return updated;
  });

  return {
    status: input.request.status,
    payment: serializePayment(payment),
    checkoutUrl: session.processUrl,
    message: "Se inició el proceso de pago. Serás redirigido al Web Checkout de Banchile Pagos.",
  };
}

export async function confirmPayment(input: {
  request: PaymentRequest;
  quote: PaymentQuote | null;
  paymentId?: string;
}) {
  const acceptedQuote = requireAcceptedContext(input.request, input.quote);
  const payment = input.paymentId
    ? await prisma.payment.findFirst({ where: { id: input.paymentId, requestId: input.request.id, quoteId: acceptedQuote.id } })
    : await getActivePaymentForQuote(acceptedQuote.id) ?? (await getLatestPaymentForRequest(input.request.id));

  if (!payment) {
    throw new DomainError("No encontramos un intento de pago para confirmar.", 404);
  }

  if (payment.provider !== "BANCHILE" || !payment.providerReference) {
    return {
      status: input.request.status,
      payment: serializePayment(payment),
      message: "Este intento de pago no admite confirmación automática.",
    };
  }
  if (["PAID", "FAILED", "CANCELLED"].includes(payment.status)) {
    return {
      status: input.request.status,
      payment: serializePayment(payment),
      message: payment.status === "PAID" ? "El pago ya está confirmado." : "Este intento de pago ya fue resuelto.",
    };
  }

  let session;
  try {
    session = await queryBanchileSession(payment.providerReference);
  } catch (queryError) {
    throw new DomainError(queryError instanceof Error ? queryError.message : "No fue posible consultar el estado del pago.", 502);
  }

  const nextStatus = mapBanchileStatusToPaymentStatus(session.status.status as BanchileSessionStatusCode);
  if (nextStatus === "PROCESSING") {
    const refreshed = payment.status === "PENDING" ? await prisma.payment.update({ where: { id: payment.id }, data: { status: "PROCESSING" } }) : payment;
    return {
      status: input.request.status,
      payment: serializePayment(refreshed),
      checkoutUrl: refreshed.checkoutUrl ?? session.processUrl,
      message: "El pago aún está pendiente de confirmación por Banchile Pagos.",
    };
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
        requestId: input.request.id,
        status: input.request.status,
        eventType: nextStatus === "PAID" ? "PAYMENT_CONFIRMED" : "PAYMENT_FAILED",
        note:
          nextStatus === "PAID"
            ? `Pago confirmado por Banchile Pagos (${transaction?.authorization ?? payment.providerReference}).`
            : session.status.message || "El pago fue rechazado por Banchile Pagos.",
      },
    });
    return next;
  });

  return {
    status: input.request.status,
    payment: serializePayment(updated),
    message: updated.status === "PAID" ? "Pago confirmado correctamente." : "El pago fue rechazado. Puedes reintentar o solicitar ayuda a AXESSIA.",
  };
}

export async function completeSimulatedPayment(input: {
  request: PaymentRequest;
  quote: PaymentQuote | null;
  paymentId: string;
  outcome: "success" | "failure" | "cancel";
}) {
  const acceptedQuote = requireAcceptedContext(input.request, input.quote);
  const payment = await prisma.payment.findFirst({
    where: { id: input.paymentId, requestId: input.request.id, quoteId: acceptedQuote.id },
  });
  if (!payment) {
    throw new DomainError("No encontramos ese intento de pago.", 404);
  }

  if (payment.status === "PAID") {
    return {
      status: input.request.status,
      payment: serializePayment(payment),
      message: "El pago ya estaba confirmado.",
    };
  }

  if (!["PENDING", "PROCESSING"].includes(payment.status)) {
    throw new DomainError("Este intento de pago ya no admite una nueva resolución. Inicia un reintento.", 409);
  }

  const resolved = resolveSimulatedPaymentOutcome(input.outcome);
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
        requestId: input.request.id,
        status: input.request.status,
        eventType: resolved.eventType,
        note:
          resolved.status === "PAID"
            ? `Pago confirmado por pasarela (${next.providerReference}).`
            : resolved.failureReason,
      },
    });
    return next;
  });

  return {
    status: input.request.status,
    payment: serializePayment(updated),
    message:
      updated.status === "PAID"
        ? "Pago confirmado correctamente."
        : updated.status === "CANCELLED"
          ? "Cancelaste el intento de pago. Puedes reintentar cuando quieras."
          : "El pago fue rechazado. Puedes reintentar o solicitar ayuda a AXESSIA.",
  };
}

export async function requestPaymentHelp(input: {
  request: PaymentRequest;
  quote: PaymentQuote | null;
  paymentId?: string;
  message: string;
}) {
  if (!input.message) {
    throw new DomainError("Describe el problema con el pago para que AXESSIA pueda ayudarte.", 400);
  }

  const acceptedQuote = requireAcceptedContext(input.request, input.quote);
  const requestNumber = requireRequestNumber(input.request);

  let payment: Payment | null = input.paymentId
    ? await prisma.payment.findFirst({ where: { id: input.paymentId, requestId: input.request.id } })
    : await getLatestPaymentForRequest(input.request.id);

  if (!payment) {
    const { amount } = quoteAmount(acceptedQuote);
    payment = await prisma.payment.create({
      data: {
        requestId: input.request.id,
        quoteId: acceptedQuote.id,
        amount,
        currency: "CLP",
        status: "HELP_REQUESTED",
        provider: "SIMULATED",
        providerReference: createProviderReference(input.request.id),
        helpMessage: input.message,
        failureReason: "El cliente solicitó ayuda antes de completar un pago.",
      },
    });
  } else if (payment.status !== "PAID") {
    payment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "HELP_REQUESTED",
        helpMessage: input.message,
      },
    });
  }

  await prisma.$transaction([
    prisma.quoteRequestComment.create({
      data: {
        requestId: input.request.id,
        quoteId: acceptedQuote.id,
        authorType: "CUSTOMER",
        message: `Ayuda con pago: ${input.message}`,
      },
    }),
    prisma.quoteRequestEvent.create({
      data: {
        requestId: input.request.id,
        status: input.request.status,
        eventType: "PAYMENT_HELP_REQUESTED",
        note: input.message,
      },
    }),
  ]);

  void sendPaymentHelpRequestEmail({
    customerName: input.request.requesterName,
    customerEmail: input.request.requesterEmail,
    requestNumber,
    quoteNumber: acceptedQuote.quoteNumber || `C-${acceptedQuote.version}`,
    paymentReference: payment.providerReference,
    message: input.message,
  });

  return {
    status: input.request.status,
    payment: serializePayment(payment),
    message: "Tu solicitud de ayuda fue enviada al equipo AXESSIA. Mantienes tu cotización aceptada y puedes reintentar el pago.",
  };
}
