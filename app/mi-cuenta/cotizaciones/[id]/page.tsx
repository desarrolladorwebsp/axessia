import { notFound, redirect } from "next/navigation";
import { DomainError } from "@/lib/domain-error";
import { requirePortalCustomer } from "@/lib/customer-access";
import { portalRequestDetailPath } from "@/lib/portal/paths";
import { getPortalQuoteDetail } from "@/lib/portal/queries";

export default async function PortalQuoteDetailRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const customer = await requirePortalCustomer();
  const { id } = await params;
  const { payment } = await searchParams;

  let quote;
  try {
    quote = await getPortalQuoteDetail(customer.id, id);
  } catch (error) {
    if (error instanceof DomainError && error.status === 404) notFound();
    throw error;
  }

  redirect(portalRequestDetailPath(quote.requestId, payment));
}
