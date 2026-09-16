import { requirePortalCustomer } from "@/lib/customer-access";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  await requirePortalCustomer();

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6 lg:px-8">
      {children}
    </main>
  );
}
