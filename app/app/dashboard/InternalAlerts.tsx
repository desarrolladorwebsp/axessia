"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Hourglass, Timer } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AlertErrorBoundary from "../components/AlertErrorBoundary";
import Modal from "../components/Modal";
import {
  parseDashboardAlerts,
  unavailableDashboardAlerts,
  type AlertCollection,
  type DashboardInternalAlerts,
  type StalledRequestAlert,
} from "@/lib/internal-alerts/load";

const stalledReasonLabels: Record<StalledRequestAlert["reason"], string> = {
  UNASSIGNED: "Recibida hace más de 1 día y sin asignar",
  ASSIGNED_WITHOUT_QUOTE: "Asignada hace más de 3 días y sin cotización",
};

type OpenAlert = "expiring" | "stalled" | null;

export default function InternalAlerts() {
  return (
    <AlertErrorBoundary>
      <InternalAlertsPanel />
    </AlertErrorBoundary>
  );
}

function InternalAlertsPanel() {
  const [alerts, setAlerts] = useState<DashboardInternalAlerts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openAlert, setOpenAlert] = useState<OpenAlert>(null);

  useEffect(() => {
    let cancelled = false;

    const loadAlerts = async () => {
      try {
        const response = await fetch("/api/internal-alerts");
        if (!response.ok) throw new Error("No fue posible cargar las alertas internas");
        const parsed = parseDashboardAlerts(await response.json());
        if (!cancelled) setAlerts(parsed);
      } catch (error) {
        console.error("Alerta interna no disponible:", error);
        if (!cancelled) setAlerts(unavailableDashboardAlerts());
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadAlerts();
    return () => {
      cancelled = true;
    };
  }, []);

  const expiring = alerts?.expiringQuotes ?? unavailableDashboardAlerts().expiringQuotes;
  const stalled = alerts?.stalledRequests ?? unavailableDashboardAlerts().stalledRequests;

  return (
    <section aria-label="Alertas internas del equipo" className="mb-5">
      <div className="mb-3">
        <h2 className="font-display text-sm font-extrabold text-[var(--navy)]">Alertas internas</h2>
        <p className="text-xs text-[var(--text-secondary)]">Visibles solo para el equipo. No se muestran al cliente.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="h-[92px] animate-pulse rounded-2xl bg-white" />
          <div className="h-[92px] animate-pulse rounded-2xl bg-white" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AlertCapsule
            label="Cotizaciones por vencer"
            detail={expiring.available ? "Menos de 3 días de vigencia" : "No disponible"}
            total={expiring.available ? expiring.total : null}
            icon={Timer}
            disabled={!expiring.available}
            onClick={() => setOpenAlert("expiring")}
          />
          <AlertCapsule
            label="Solicitudes sin avance"
            detail={capsuleDetail(stalled, "Sin asignar o sin cotización")}
            total={stalled.available ? stalled.total : null}
            icon={Hourglass}
            disabled={!stalled.available}
            onClick={() => setOpenAlert("stalled")}
          />
        </div>
      )}

      <Modal
        open={openAlert === "expiring"}
        onClose={() => setOpenAlert(null)}
        title="Cotizaciones próximas a vencer"
        description="Cotizaciones con menos de 3 días de vigencia. Solo para el equipo interno."
      >
        <PreviewNote collection={expiring} />
        {expiring.items.length === 0 ? (
          <EmptyAlert message="No hay cotizaciones próximas a vencer." />
        ) : (
          <AlertTable
            headers={["N° solicitud", "N° cotización", "Monto", "Fecha de creación", "Responsable"]}
            rows={expiring.items.map((item) => ({
              key: item.quoteId,
              cells: [
                <RequestLink key="request" requestId={item.requestId} requestNumber={item.requestNumber} />,
                item.quoteNumber || "Sin número",
                formatAmount(item.amount),
                formatDate(item.createdAt),
                item.responsibleName,
              ],
            }))}
          />
        )}
      </Modal>

      <Modal
        open={openAlert === "stalled"}
        onClose={() => setOpenAlert(null)}
        title="Solicitudes sin avance"
        description="Sin asignar después de 1 día, o asignadas hace más de 3 días y todavía sin cotización."
      >
        {stalled.partial ? (
          <p role="status" className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Una parte de esta revisión no está disponible. El resto del panel sigue operativo.
          </p>
        ) : null}
        <PreviewNote collection={stalled} />
        {stalled.items.length === 0 ? (
          <EmptyAlert message="No hay solicitudes estancadas con estos criterios." />
        ) : (
          <AlertTable
            headers={["N° solicitud", "Situación", "Fecha de recepción", "Responsable"]}
            rows={stalled.items.map((item) => ({
              key: `${item.reason}-${item.requestId}`,
              cells: [
                <RequestLink key="request" requestId={item.requestId} requestNumber={item.requestNumber} />,
                stalledReasonLabels[item.reason],
                formatDate(item.createdAt),
                item.responsibleName,
              ],
            }))}
          />
        )}
      </Modal>
    </section>
  );
}

function capsuleDetail(collection: AlertCollection<StalledRequestAlert>, readyDetail: string) {
  if (!collection.available) return "No disponible";
  if (collection.partial) return "Revisión incompleta";
  return readyDetail;
}

function AlertCapsule({
  label,
  detail,
  total,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string;
  detail: string;
  total: number | null;
  icon: LucideIcon;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={total == null ? `${label}. No disponible` : `${label}. ${total}`}
      className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 text-left shadow-[0_10px_30px_rgba(7,30,65,0.04)] transition hover:-translate-y-0.5 hover:border-amber-200 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:border-[var(--border)]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-2xl font-extrabold leading-none text-[var(--navy)]">{total ?? "—"}</span>
        <span className="mt-1 block truncate text-xs font-semibold text-[var(--navy)]">{label}</span>
        <span className="block truncate text-[10px] text-[var(--text-secondary)]">{detail}</span>
      </span>
    </button>
  );
}

function PreviewNote<T>({ collection }: { collection: AlertCollection<T> }) {
  if (!collection.available || collection.total <= collection.items.length) return null;
  return (
    <p className="mb-3 text-xs text-[var(--text-secondary)]">
      Mostrando {collection.items.length} de {collection.total}.
    </p>
  );
}

function EmptyAlert({ message }: { message: string }) {
  return <p className="rounded-xl bg-[var(--background)] px-4 py-6 text-center text-sm text-[var(--text-secondary)]">{message}</p>;
}

function RequestLink({ requestId, requestNumber }: { requestId: string; requestNumber: string | null }) {
  return (
    <Link href={`/app/solicitudes/${requestId}`} className="font-bold text-[var(--blue)] hover:underline">
      {requestNumber || "Sin número"}
    </Link>
  );
}

function AlertTable({ headers, rows }: { headers: string[]; rows: Array<{ key: string; cells: Array<string | ReactNode> }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--background)]">
            {headers.map((header) => (
              <th key={header} className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-[var(--border)] last:border-0">
              {row.cells.map((cell, index) => (
                <td key={`${row.key}-${headers[index] ?? index}`} className="px-3 py-3 text-xs text-[var(--navy)]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleDateString("es-CL");
}

function formatAmount(value: number | null) {
  if (value == null) return "Sin monto";
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);
}
