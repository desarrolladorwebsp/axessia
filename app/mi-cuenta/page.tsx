import { requirePortalCustomer } from "@/lib/customer-access";
import { listPortalRequests } from "@/lib/portal/queries";
import { PORTAL_HOME_PATH } from "@/lib/portal/paths";
import NewRequestButton from "@/components/portal/NewRequestButton";
import { PortalEmptyState } from "@/components/portal/EmptyState";
import { PortalPagination } from "@/components/portal/Pagination";
import { RequestList } from "@/components/portal/RequestList";

export default async function PortalHomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const customer = await requirePortalCustomer();
  const { page } = await searchParams;
  const { requests, pagination } = await listPortalRequests(customer.id, page);
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--purple)]">Portal del cliente</p>
        <h1 className="font-display mt-1 text-2xl font-extrabold text-[var(--navy)] sm:text-3xl">
          Hola, {customer.name}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          Desde aquí puedes consultar y gestionar tus solicitudes: estado, documentos, cotización y despacho.
        </p>
      </header>

      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-extrabold text-[var(--navy)]">Tus solicitudes</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Revisa el avance de cada solicitud asociada a tu cuenta.
            </p>
          </div>
          <NewRequestButton />
        </div>

        {requests.length === 0 ? (
          <div className="mt-6">
            <PortalEmptyState
              title="Aún no tienes solicitudes"
              description="Cuando realices una solicitud podrás consultar aquí su estado, documentos y cotización."
              action={
                <NewRequestButton
                  label="Crear mi primera solicitud"
                  className="brand-gradient inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(8,127,213,0.18)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2"
                />
              }
            />
          </div>
        ) : (
          <div className="mt-6">
            <RequestList requests={requests} />
          </div>
        )}

        <PortalPagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          shown={requests.length}
          itemLabel="solicitudes"
          href={PORTAL_HOME_PATH}
        />
      </section>
    </div>
  );
}
