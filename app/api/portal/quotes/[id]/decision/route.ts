import { NextRequest, NextResponse } from "next/server";
import { getPortalCustomer } from "@/lib/customer-access";
import { portalErrorResponse, unauthorizedPortalResponse } from "@/lib/portal/http";
import { decideQuote } from "@/lib/quote-decision";
import { getOwnedQuoteForAction } from "@/lib/portal/queries";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const customer = await getPortalCustomer();
    if (!customer) return unauthorizedPortalResponse();
    const { id } = await params;
    const body = (await request.json()) as { action?: unknown; comment?: unknown };
    const action = body.action === "accept" || body.action === "reject" ? body.action : null;
    if (!action) {
      return NextResponse.json({ error: "La acción no es válida." }, { status: 400 });
    }
    const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 2000) : "";
    const quote = await getOwnedQuoteForAction(customer.id, id);
    const result = await decideQuote({
      request: quote.request,
      quote,
      action,
      comment,
      expectedQuoteId: id,
    });
    return NextResponse.json(result);
  } catch (error) {
    return portalErrorResponse(error);
  }
}
