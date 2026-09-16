import { NextRequest, NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";
import { getPortalCustomer } from "@/lib/customer-access";
import {
  advanceWithoutPayment,
  confirmPayment,
  requestPaymentHelp,
  startPayment,
} from "@/lib/payment-flow";
import { portalErrorResponse, unauthorizedPortalResponse } from "@/lib/portal/http";
import { portalRequestDetailPath } from "@/lib/portal/paths";
import { getOwnedQuoteForAction } from "@/lib/portal/queries";

type PaymentAction = "start_payment" | "confirm_payment" | "advance_without_payment" | "payment_help";

export async function POST(request: NextRequest) {
  try {
    const customer = await getPortalCustomer();
    if (!customer) return unauthorizedPortalResponse();

    const body = (await request.json()) as {
      quoteId?: unknown;
      action?: unknown;
      paymentId?: unknown;
      message?: unknown;
    };
    const quoteId = typeof body.quoteId === "string" ? body.quoteId.trim() : "";
    const action = body.action as PaymentAction | unknown;
    const paymentId = typeof body.paymentId === "string" ? body.paymentId.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";

    if (!quoteId) {
      return NextResponse.json({ error: "Cotización no encontrada." }, { status: 404 });
    }
    if (
      action !== "start_payment"
      && action !== "confirm_payment"
      && action !== "advance_without_payment"
      && action !== "payment_help"
    ) {
      return NextResponse.json({ error: "La acción no es válida." }, { status: 400 });
    }

    const quote = await getOwnedQuoteForAction(customer.id, quoteId);
    const paymentRequest = quote.request;
    const paymentQuote = quote;

    if (action === "advance_without_payment") {
      return NextResponse.json(await advanceWithoutPayment(paymentRequest, paymentQuote));
    }

    if (action === "start_payment") {
      const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "127.0.0.1";
      const userAgent = request.headers.get("user-agent") || "AXESSIA Portal";
      const returnUrl = `${getAppBaseUrl()}${portalRequestDetailPath(quote.request.id, "return")}`;
      return NextResponse.json(await startPayment({
        request: paymentRequest,
        quote: paymentQuote,
        ipAddress,
        userAgent,
        returnUrl,
      }));
    }

    if (action === "confirm_payment") {
      return NextResponse.json(await confirmPayment({
        request: paymentRequest,
        quote: paymentQuote,
        paymentId: paymentId || undefined,
      }));
    }

    return NextResponse.json(await requestPaymentHelp({
      request: paymentRequest,
      quote: paymentQuote,
      paymentId: paymentId || undefined,
      message,
    }));
  } catch (error) {
    return portalErrorResponse(error);
  }
}
