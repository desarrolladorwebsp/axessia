import { NextRequest, NextResponse } from "next/server";
import { getPortalCustomer } from "@/lib/customer-access";
import { portalErrorResponse, unauthorizedPortalResponse } from "@/lib/portal/http";
import { listPortalRequests } from "@/lib/portal/queries";

export async function GET(request: NextRequest) {
  try {
    const customer = await getPortalCustomer();
    if (!customer) return unauthorizedPortalResponse();
    return NextResponse.json(await listPortalRequests(customer.id, request.nextUrl.searchParams.get("page")));
  } catch (error) {
    return portalErrorResponse(error);
  }
}
