import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CUSTOMER_SESSION_COOKIE, verifyCustomerSessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const PORTAL_CUSTOMER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  rut: true,
  city: true,
  promotionsConsent: true,
  createdAt: true,
} as const;

export type PortalCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  rut: string;
  city: string;
  promotionsConsent: boolean;
  createdAt: Date;
};

export const getPortalCustomer = cache(async (): Promise<PortalCustomer | null> => {
  const cookieStore = await cookies();
  const session = verifyCustomerSessionToken(cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value);
  if (!session) return null;

  return prisma.customer.findUnique({
    where: { id: session.customerId },
    select: PORTAL_CUSTOMER_SELECT,
  });
});

export async function requirePortalCustomer(): Promise<PortalCustomer> {
  const customer = await getPortalCustomer();
  if (!customer) {
    redirect("/ingresar");
  }
  return customer;
}
