"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ClipboardList, FileText, ReceiptText, UserRound } from "lucide-react";
import { ErrorState } from "../../components/States";

type RequestDetail = {
  id: string;
  requestNumber: string | null;
  status: string;
  price: number | null;
  patientName: string | null;
  patientRut: string | null;
  createdAt: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    rut: string;
    city: string;
  };
  prescription: {
    fileName: string;
    mimeType: string;
    fileSize: number;
  } | null;
  medications: Array<{
    id: string;
    commercialName: string;
    activeIngredient: string;
    concentration: string;
    tabletQuantity: number;
  }>;
};

const statusLabels: Record<string, string> = {
  RECEIVED: "Recibida",
  REVIEWING: "En revisión",
  QUOTED: "Cotizada",
  APPROVED: "Aprobada",
  PROCESSING: "En proceso",
  DELIVERED: "Entregada",
};

export default function SolicitudDetailPage() {
  const params = useParams<{ id: string }>();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(`/api/quote-requests/${params.id}`);

        if (!response.ok) {
          throw new Error(response.status === 404 ? "La solicitud no existe o fue eliminada" : "Error al cargar la solicitud");
        }

        setRequest((await response.json()) as RequestDetail);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Error desconocido");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequest();
  }, [params.id]);

  if (isLoading) {
    return <div className="w-full px-4 py-6 text-sm text-[var(--text-secondary)] sm:px-6 lg:px-8">Cargando solicitud...</div>;
  }

  if (error || !request) {
    return (
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <ErrorState title="No fue posible abrir la solicitud" description={error || "Solicitud no encontrada"} />
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <Link href="/app/solicitudes" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--blue)] transition-colors hover:text-[var(--navy)]">
        <ArrowLeft className="h-4 w-4" />
        Volver a solicitudes
      </Link>

      <header className="mt-5 flex flex-col gap-5 border-b border-[var(--border)] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--blue)]">Solicitud</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold font-display text-[var(--navy)] sm:text-3xl">{request.requestNumber ?? "Sin número"}</h1>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {statusLabels[request.status] || request.status}
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Recibida el {new Date(request.createdAt).toLocaleDateString("es-CL", { dateStyle: "long" })}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" disabled title="Próximamente" className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] opacity-60">
            Gestionar estado
          </button>
          <button type="button" disabled title="Próximamente" className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-[var(--navy)] px-4 py-2.5 text-sm font-semibold text-white opacity-60">
            <ReceiptText className="h-4 w-4" />
            Crear cotización
          </button>
        </div>
      </header>

      <div className="grid gap-8 py-7 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <section className="space-y-8">
          <DetailSection icon={<ClipboardList className="h-5 w-5" />} title="Medicamentos solicitados">
            <div className="overflow-x-auto border-y border-[var(--border)]">
              <table className="w-full min-w-[38rem] text-left text-sm">
                <thead className="bg-[var(--background)] text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  <tr><th className="px-4 py-3">Medicamento</th><th className="px-4 py-3">Principio activo</th><th className="px-4 py-3">Concentración</th><th className="px-4 py-3 text-right">Cantidad</th></tr>
                </thead>
                <tbody>
                  {request.medications.map((medication) => (
                    <tr key={medication.id} className="border-t border-[var(--border)] text-[var(--text-secondary)]">
                      <td className="px-4 py-4 font-semibold text-[var(--navy)]">{medication.commercialName}</td>
                      <td className="px-4 py-4">{medication.activeIngredient}</td>
                      <td className="px-4 py-4">{medication.concentration}</td>
                      <td className="px-4 py-4 text-right">{medication.tabletQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DetailSection>

          <DetailSection icon={<FileText className="h-5 w-5" />} title="Receta médica">
            {request.prescription ? (
              <div className="flex items-center justify-between gap-4 border-y border-[var(--border)] py-4 text-sm">
                <div className="min-w-0"><p className="truncate font-semibold text-[var(--navy)]">{request.prescription.fileName}</p><p className="mt-1 text-[var(--text-secondary)]">{request.prescription.mimeType} · {(request.prescription.fileSize / 1024).toFixed(1)} KB</p></div>
                <span className="shrink-0 text-xs font-semibold text-[var(--text-secondary)]">Archivo registrado</span>
              </div>
            ) : <p className="text-sm text-[var(--text-secondary)]">No se adjuntó una receta.</p>}
          </DetailSection>
        </section>

        <aside className="space-y-8 border-t border-[var(--border)] pt-7 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
          <DetailSection icon={<UserRound className="h-5 w-5" />} title="Cliente">
            <dl className="space-y-4 text-sm"><Info label="Nombre" value={request.customer.name} /><Info label="Correo" value={request.customer.email} /><Info label="Teléfono" value={request.customer.phone} /><Info label="RUT" value={request.customer.rut} /><Info label="Ciudad" value={request.customer.city} /></dl>
          </DetailSection>
          <DetailSection icon={<UserRound className="h-5 w-5" />} title="Paciente">
            <dl className="space-y-4 text-sm"><Info label="Nombre" value={request.patientName || "No informado"} /><Info label="RUT" value={request.patientRut || "No informado"} /></dl>
          </DetailSection>
        </aside>
      </div>
    </div>
  );
}

function DetailSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <section><h2 className="mb-4 flex items-center gap-2 text-base font-bold text-[var(--navy)]">{icon}{title}</h2>{children}</section>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">{label}</dt><dd className="mt-1 break-words font-medium text-[var(--navy)]">{value}</dd></div>;
}