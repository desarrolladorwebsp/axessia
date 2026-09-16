import Link from "next/link";
import { REQUEST_STATUS_TONES, StatusBadge } from "@/components/portal/StatusBadge";
import { formatDate, formatMoney } from "@/components/portal/format";
import { portalRequestDetailPath } from "@/lib/portal/paths";
import { quoteStatusLabel } from "@/lib/quote-status";

export type PortalRequestListItem = {
  id: string;
  requestNumber: string | null;
  status: string;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
  productSummary: string;
  quote: { quoteNumber: string | null; status: string; total: string | null } | null;
};

export function RequestList({ requests }: { requests: PortalRequestListItem[] }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-[var(--border)] bg-white lg:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Tus solicitudes</caption>
          <thead className="bg-[var(--background)] text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
            <tr>
              <th scope="col" className="px-4 py-3">Nº solicitud</th>
              <th scope="col" className="px-4 py-3">Fecha</th>
              <th scope="col" className="px-4 py-3">Estado</th>
              <th scope="col" className="px-4 py-3">Producto</th>
              <th scope="col" className="px-4 py-3">Cotización</th>
              <th scope="col" className="px-4 py-3">Actualización</th>
              <th scope="col" className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id} className="border-t border-[var(--border)] transition-colors hover:bg-[var(--background)]">
                <td className="px-4 py-4 font-extrabold text-[var(--blue)]">
                  <Link
                    href={portalRequestDetailPath(request.id)}
                    className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2"
                  >
                    {request.requestNumber}
                  </Link>
                </td>
                <td className="px-4 py-4 text-[var(--text-secondary)]">{formatDate(request.createdAt)}</td>
                <td className="px-4 py-4">
                  <StatusBadge label={request.statusLabel} tone={REQUEST_STATUS_TONES[request.status]} />
                </td>
                <td className="max-w-[220px] truncate px-4 py-4 font-semibold text-[var(--navy)]" title={request.productSummary}>
                  {request.productSummary}
                </td>
                <td className="px-4 py-4">
                  {request.quote ? (
                    <div>
                      <p className="text-xs font-semibold text-[var(--navy)]">
                        {request.quote.quoteNumber || quoteStatusLabel(request.quote.status)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {quoteStatusLabel(request.quote.status)}
                        {request.quote.total ? ` · ${formatMoney(request.quote.total)}` : ""}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--text-secondary)]">Sin cotización</span>
                  )}
                </td>
                <td className="px-4 py-4 text-[var(--text-secondary)]">{formatDate(request.updatedAt)}</td>
                <td className="px-4 py-4 text-right">
                  <Link
                    href={portalRequestDetailPath(request.id)}
                    className="inline-flex min-h-11 items-center rounded-full border border-[var(--border)] px-3 text-xs font-bold text-[var(--navy)] transition hover:border-[var(--blue)] hover:text-[var(--blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2"
                  >
                    Ver detalle
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-3 lg:hidden">
        {requests.map((request) => (
          <li key={request.id}>
            <article className="card-surface rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-[var(--blue)]">{request.requestNumber}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{formatDate(request.createdAt)}</p>
                </div>
                <StatusBadge label={request.statusLabel} tone={REQUEST_STATUS_TONES[request.status]} />
              </div>
              <p className="mt-3 text-sm font-semibold text-[var(--navy)]">{request.productSummary}</p>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                {request.quote
                  ? `${request.quote.quoteNumber ? `${request.quote.quoteNumber} · ` : ""}${quoteStatusLabel(request.quote.status)}${request.quote.total ? ` · ${formatMoney(request.quote.total)}` : ""}`
                  : "Sin cotización"}
                {` · Actualizada ${formatDate(request.updatedAt)}`}
              </p>
              <Link
                href={portalRequestDetailPath(request.id)}
                className="mt-4 inline-flex min-h-11 items-center rounded-full border border-[var(--border)] px-4 text-sm font-bold text-[var(--navy)] transition hover:border-[var(--blue)] hover:text-[var(--blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2"
              >
                Ver detalle
              </Link>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
