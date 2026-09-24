"use client";

import { useRef, useState } from "react";
import { ChevronDown, FileText, Loader2, Upload } from "lucide-react";
import {
  CLIENT_DOCUMENT_KIND_LABELS,
  CLIENT_DOCUMENT_KINDS,
  resolveClientDocumentLabel,
  type ClientDocumentKind,
} from "@/lib/client-document-type";
import { storedFileApiPath } from "@/lib/documents/urls";
import { PrimaryButton } from "../../components/Buttons";

type ClientDocument = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  hasStoredFile?: boolean;
  documentKind?: ClientDocumentKind | null;
  customLabel?: string | null;
};

type GeneratedMandate = { fileName: string; sentAt: string | null } | null;
type Prescription = { id: string; fileName: string; mimeType: string; fileSize: number; hasStoredFile?: boolean } | null;

const fieldClassName = "h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-xs font-semibold text-[var(--navy)] outline-none transition focus:border-[var(--blue)] focus:ring-4 focus:ring-[var(--blue)]/10";

export default function ClientDocumentsCard({ requestId, initialDocuments, generatedMandate, prescription, prescriptionTitle }: { requestId: string; initialDocuments: ClientDocument[]; generatedMandate: GeneratedMandate; prescription: Prescription; prescriptionTitle: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState(initialDocuments);
  const [documentKind, setDocumentKind] = useState<ClientDocumentKind | "">("");
  const [customLabel, setCustomLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);

  const uploadDocument = async (file: File) => {
    if (isSaving) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("El documento no puede superar los 10 MB.");
      return;
    }
    if (!documentKind) {
      setError("Selecciona el tipo de documento.");
      return;
    }
    if (documentKind === "OTHER" && customLabel.trim().length < 2) {
      setError("Indica el nombre del documento.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentKind", documentKind);
      if (documentKind === "OTHER") formData.append("customLabel", customLabel.trim());
      const response = await fetch(`/api/quote-requests/${requestId}/documents`, {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as ClientDocument & { error?: string };
      if (!response.ok) throw new Error(result.error || "No fue posible asociar el documento.");
      setDocuments((current) => [result, ...current]);
      setDocumentKind("");
      setCustomLabel("");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "No fue posible asociar el documento.");
    } finally {
      setIsSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openFilePicker = () => {
    if (isSaving) return;
    if (!documentKind) {
      setError("Selecciona el tipo de documento.");
      return;
    }
    if (documentKind === "OTHER" && customLabel.trim().length < 2) {
      setError("Indica el nombre del documento.");
      return;
    }
    setError("");
    fileInputRef.current?.click();
  };

  const totalDocuments = documents.length + (prescription ? 1 : 0);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[0_10px_28px_rgba(7,30,65,0.04)]">
      <button type="button" onClick={() => setIsExpanded((current) => !current)} aria-expanded={isExpanded} aria-controls="request-documents" className="flex w-full items-center gap-3 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--blue)]/10 text-[var(--blue)]"><FileText className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1"><span className="block font-display text-base font-extrabold text-[var(--navy)]">Documentos</span><span className="mt-0.5 block truncate text-xs text-[var(--text-secondary)]">{totalDocuments} archivo{totalDocuments === 1 ? "" : "s"} asociado{totalDocuments === 1 ? "" : "s"} a esta solicitud</span></span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-[var(--purple)] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </button>
      {isExpanded ? <div id="request-documents" className="mt-5">
        {prescription ? <div className="mb-4 flex flex-col gap-4 rounded-xl border border-[var(--purple)]/20 bg-violet-50/40 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--purple)]"><FileText className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--purple)]">{prescriptionTitle}</span><strong className="mt-1 block truncate text-sm text-[var(--navy)]">{prescription.fileName}</strong><span className="mt-1 block text-xs text-[var(--text-secondary)]">{prescription.mimeType} · {(prescription.fileSize / 1024).toFixed(1)} KB</span></span></div>{prescription.hasStoredFile ? <a href={storedFileApiPath("prescriptions", prescription.id)} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-center text-xs font-bold text-[var(--blue)] transition hover:border-[var(--blue)]">Ver {prescriptionTitle.toLowerCase()}</a> : <span className="shrink-0 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-center text-xs font-bold text-[var(--text-secondary)]">Archivo no disponible</span>}</div> : <div className="mb-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--text-secondary)]">No se adjuntó {prescriptionTitle.toLowerCase()}.</div>}
      <div className="space-y-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] p-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-[var(--navy)]">Tipo de documento</span>
          <select
            value={documentKind}
            onChange={(event) => {
              setDocumentKind(event.target.value as ClientDocumentKind | "");
              setError("");
              if (event.target.value !== "OTHER") setCustomLabel("");
            }}
            className={fieldClassName}
          >
            <option value="">Selecciona un tipo</option>
            {CLIENT_DOCUMENT_KINDS.map((kind) => (
              <option key={kind} value={kind}>{CLIENT_DOCUMENT_KIND_LABELS[kind]}</option>
            ))}
          </select>
        </label>
        {documentKind === "OTHER" ? (
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-[var(--navy)]">Nombre del documento</span>
            <input
              type="text"
              value={customLabel}
              onChange={(event) => {
                setCustomLabel(event.target.value);
                setError("");
              }}
              maxLength={80}
              placeholder="Ej. Certificado médico, receta adicional"
              className={fieldClassName}
            />
          </label>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--text-secondary)]">PDF o imagen de hasta 10 MB</p>
          <PrimaryButton size="sm" onClick={openFilePicker} disabled={isSaving} icon={isSaving ? Loader2 : Upload} className={isSaving ? "[&_svg]:animate-spin" : ""}>
            {isSaving ? "Cargando..." : "Cargar documento"}
          </PrimaryButton>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadDocument(file);
          }}
        />
      </div>
      {error && <p role="alert" className="mt-3 text-xs font-semibold text-rose-600">{error}</p>}
      {generatedMandate && <a href={`/api/mandates/${requestId}/pdf`} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--blue)]/20 bg-blue-50/50 p-3 transition hover:border-[var(--blue)]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--blue)]"><FileText className="h-4 w-4" /></span><span className="min-w-0"><strong className="block truncate text-xs text-[var(--navy)]">{generatedMandate.fileName}</strong><span className="mt-0.5 block text-[10px] text-[var(--text-secondary)]">Mandato generado{generatedMandate.sentAt ? ` y enviado el ${new Date(generatedMandate.sentAt).toLocaleDateString("es-CL")}` : ""}</span></span></a>}
      {documents.length > 0 && (
        <ul className="mt-4 divide-y divide-[var(--border)]">
          {documents.map((document) => (
            <li key={document.id} className="flex items-center gap-3 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--purple)]/10 text-[var(--purple)]"><FileText className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-[var(--navy)]">{resolveClientDocumentLabel(document)}</p>
                <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">{document.fileName} · {(document.fileSize / 1024).toFixed(1)} KB · {new Date(document.createdAt).toLocaleDateString("es-CL")}</p>
              </div>
              {document.hasStoredFile ? <a href={storedFileApiPath("client-documents", document.id)} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-bold text-[var(--blue)] transition hover:border-[var(--blue)]">Ver</a> : null}
            </li>
          ))}
        </ul>
      )}
      </div> : null}
    </section>
  );
}
