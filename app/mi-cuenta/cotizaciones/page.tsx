import { redirect } from "next/navigation";
import { requirePortalCustomer } from "@/lib/customer-access";
import { PORTAL_HOME_PATH } from "@/lib/portal/paths";

export default async function PortalQuotesRedirectPage() {
  await requirePortalCustomer();
  redirect(PORTAL_HOME_PATH);
}
