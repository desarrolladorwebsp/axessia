import { getPortalCustomer } from "@/lib/customer-access";
import { portalErrorResponse, unauthorizedPortalResponse } from "@/lib/portal/http";
import { getOwnedQuotePdfResponse } from "@/lib/portal/quote-pdf";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const customer = await getPortalCustomer();
    if (!customer) return unauthorizedPortalResponse();
    const { id } = await params;
    return await getOwnedQuotePdfResponse(customer.id, id);
  } catch (error) {
    return portalErrorResponse(error);
  }
}
