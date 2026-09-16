import { NextResponse } from "next/server";
import { getPortalCustomer } from "@/lib/customer-access";
import { portalErrorResponse, unauthorizedPortalResponse } from "@/lib/portal/http";
import { getPortalRequestDetail } from "@/lib/portal/queries";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const customer = await getPortalCustomer();
    if (!customer) return unauthorizedPortalResponse();
    const { id } = await params;
    return NextResponse.json(await getPortalRequestDetail(customer.id, id));
  } catch (error) {
    return portalErrorResponse(error);
  }
}
