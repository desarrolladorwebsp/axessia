import { NextRequest, NextResponse } from "next/server";
import { getPortalCustomer } from "@/lib/customer-access";
import { portalErrorResponse, unauthorizedPortalResponse } from "@/lib/portal/http";
import { listPortalDocuments, listPortalQuotes } from "@/lib/portal/queries";

export async function GET(request: NextRequest) {
  try {
    const customer = await getPortalCustomer();
    if (!customer) return unauthorizedPortalResponse();
    const page = request.nextUrl.searchParams.get("page");
    const [quotes, documents] = await Promise.all([
      listPortalQuotes(customer.id, page),
      listPortalDocuments(customer.id, page),
    ]);
    return NextResponse.json({ quotes: quotes.quotes, documents: documents.documents, quotesPagination: quotes.pagination, documentsPagination: documents.pagination });
  } catch (error) {
    return portalErrorResponse(error);
  }
}
