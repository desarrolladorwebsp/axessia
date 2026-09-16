import { NextResponse } from "next/server";
import { getPortalCustomer } from "@/lib/customer-access";
import { portalErrorResponse, unauthorizedPortalResponse } from "@/lib/portal/http";
import { getPortalDashboard } from "@/lib/portal/queries";

export async function GET() {
  try {
    const customer = await getPortalCustomer();
    if (!customer) return unauthorizedPortalResponse();
    return NextResponse.json(await getPortalDashboard(customer.id));
  } catch (error) {
    return portalErrorResponse(error);
  }
}
