import { NextRequest, NextResponse } from "next/server";
import { getPortalCustomer } from "@/lib/customer-access";
import { portalErrorResponse, unauthorizedPortalResponse } from "@/lib/portal/http";
import { updatePortalProfile } from "@/lib/portal/queries";

export async function GET() {
  try {
    const customer = await getPortalCustomer();
    if (!customer) return unauthorizedPortalResponse();
    return NextResponse.json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      rut: customer.rut,
      city: customer.city,
      promotionsConsent: customer.promotionsConsent,
      createdAt: customer.createdAt.toISOString(),
    });
  } catch (error) {
    return portalErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const customer = await getPortalCustomer();
    if (!customer) return unauthorizedPortalResponse();
    const body = await request.json() as Record<string, unknown>;
    const updated = await updatePortalProfile(customer, body);
    return NextResponse.json(updated);
  } catch (error) {
    return portalErrorResponse(error);
  }
}
