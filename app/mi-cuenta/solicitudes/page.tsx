import { redirect } from "next/navigation";
import { requirePortalCustomer } from "@/lib/customer-access";
import { portalHomePath } from "@/lib/portal/paths";

export default async function PortalRequestsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePortalCustomer();
  const { page } = await searchParams;
  redirect(portalHomePath(page));
}
