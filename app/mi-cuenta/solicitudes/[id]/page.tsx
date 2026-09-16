import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { DomainError } from "@/lib/domain-error";
import { requirePortalCustomer } from "@/lib/customer-access";
import { PORTAL_HOME_PATH } from "@/lib/portal/paths";
import { getPortalRequestDetail } from "@/lib/portal/queries";
import { REQUEST_STATUS_TONES, StatusBadge } from "@/components/portal/StatusBadge";
import { formatDateTime } from "@/components/portal/format";
import { REQUEST_STATUS_LABELS } from "@/lib/request-status";
import { isCustomerOriginatedEvent, requestEventLabel } from "@/lib/request-events";
import { isMedicalDevice, productTypeLabel } from "@/lib/product-type";
import { RequestQuoteSection } from "@/components/portal/RequestQuoteSection";

export default async function PortalRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const customer = await requirePortalCustomer();
  const { id } = await params;
  const { payment } = await searchParams;

  let detail;
  try {
    detail = await getPortalRequestDetail(customer.id, id);
  } catch (error) {
    if (error instanceof DomainError && error.status === 404) notFound();
    throw error;
  }

  return (
    <article className="space-y-6">
      <Link
        href={PORTAL_HOME_PATH}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a solicitudes
      </Link>

      <header className="card-surface rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--purple)]">
              {productTypeLabel(detail.productType)}
            </p>
            <h1 className="font-display mt-1 text-2xl font-extrabold text-[var(--navy)]">{detail.requestNumber}</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{detail.statusDescription}</p>
          </div>
          <StatusBadge label={detail.statusLabel} tone={REQUEST_STATUS_TONES[detail.status]} />
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Creada</dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--navy)]">{formatDateTime(detail.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Última actualización</dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--navy)]">{formatDateTime(detail.updatedAt)}</dd>
          </div>
          {detail.patientName ? (
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Paciente</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--navy)]">{detail.patientName}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Estado actual</dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--navy)]">{detail.statusLabel}</dd>
          </div>
        </dl>
      </header>

      <section className="card-surface rounded-2xl p-5 sm:p-6">
        <h2 className="font-display text-lg font-extrabold text-[var(--navy)]">Productos solicitados</h2>
        <div className="mt-4 overflow-x-auto">
          {isMedicalDevice(detail.productType) ? (
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-[var(--text-secondary)]">
                <tr>
                  <th className="pb-3">Dispositivo</th>
                  <th className="pb-3">Marca</th>
                  <th className="pb-3">Modelo</th>
                  <th className="pb-3 text-right">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {detail.medicalDevices.map((item) => (
                  <tr key={`${item.name}-${item.model ?? "sin-modelo"}`} className="border-t border-[var(--border)]">
                    <td className="py-3 font-semibold text-[var(--navy)]">{item.name}</td>
                    <td className="py-3 text-[var(--text-secondary)]">{item.brand || "—"}</td>
                    <td className="py-3 text-[var(--text-secondary)]">{item.model || "—"}</td>
                    <td className="py-3 text-right text-[var(--text-secondary)]">{item.quantity ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-[var(--text-secondary)]">
                <tr>
                  <th className="pb-3">Medicamento</th>
                  <th className="pb-3">Principio activo</th>
                  <th className="pb-3">Concentración</th>
                  <th className="pb-3 text-right">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {detail.medications.map((item) => (
                  <tr key={`${item.commercialName}-${item.concentration}`} className="border-t border-[var(--border)]">
                    <td className="py-3 font-semibold text-[var(--navy)]">{item.commercialName}</td>
                    <td className="py-3 text-[var(--text-secondary)]">{item.activeIngredient}</td>
                    <td className="py-3 text-[var(--text-secondary)]">{item.concentration}</td>
                    <td className="py-3 text-right text-[var(--text-secondary)]">{item.tabletQuantity ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="card-surface rounded-2xl p-5 sm:p-6">
        <h2 className="font-display text-lg font-extrabold text-[var(--navy)]">Recetas y documentos</h2>
        {detail.documents.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            Cuando se asocien recetas o documentos a esta solicitud, podrás visualizarlos aquí.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {detail.documents.map((document) => (
              <li key={`${document.category}-${document.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--navy)]">{document.label}</p>
                  <p className="truncate text-xs text-[var(--text-secondary)]">{document.fileName}</p>
                </div>
                {document.downloadable ? (
                  <a
                    href={`/api/portal/documents/${document.category}/${document.id}`}
                    className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-[var(--blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" /> Ver
                  </a>
                ) : (
                  <span className="text-xs text-[var(--text-secondary)]">No disponible</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <RequestQuoteSection
        requestId={detail.id}
        quote={detail.currentQuote}
        confirmOnReturn={payment === "return"}
      />

      <section className="card-surface rounded-2xl p-5 sm:p-6">
        <h2 className="font-display text-lg font-extrabold text-[var(--navy)]">Historial de avances</h2>
        {detail.history.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">Aún no hay eventos registrados.</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {detail.history.map((event) => (
              <li key={event.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-[var(--navy)]">{requestEventLabel(event.eventType)}</p>
                  <StatusBadge label={REQUEST_STATUS_LABELS[event.status] || event.status} tone={REQUEST_STATUS_TONES[event.status]} />
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {formatDateTime(event.createdAt)} · {event.actorName || (isCustomerOriginatedEvent(event.eventType) ? "Tú" : "AXESSIA")}
                </p>
                {event.note ? <p className="mt-2 text-sm text-[var(--navy)]">{event.note}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      {detail.shipping ? (
        <section className="card-surface rounded-2xl p-5 sm:p-6">
          <h2 className="font-display text-lg font-extrabold text-[var(--navy)]">Despacho</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Estado</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--navy)]">{detail.shipping.statusLabel}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Envío estimado</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--navy)]">{detail.shipping.estimatedShipping || "Por confirmar"}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Inicio</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--navy)]">{formatDateTime(detail.shipping.startedAt)}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Finalización</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--navy)]">{formatDateTime(detail.shipping.completedAt)}</dd>
            </div>
          </dl>
          {detail.shipping.note ? <p className="mt-4 text-sm text-[var(--text-secondary)]">{detail.shipping.note}</p> : null}
        </section>
      ) : null}
    </article>
  );
}
