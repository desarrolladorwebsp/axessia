import { getPortalCustomer } from "@/lib/customer-access";
import { getPortalDocumentResponse } from "@/lib/portal/documents";
import { portalErrorResponse, unauthorizedPortalResponse } from "@/lib/portal/http";

type RouteContext = { params: Promise<{ category: string; documentId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const customer = await getPortalCustomer();
    if (!customer) return unauthorizedPortalResponse();
    const { category, documentId } = await params;
    return await getPortalDocumentResponse(customer.id, category, documentId);
  } catch (error) {
    return portalErrorResponse(error);
  }
}
