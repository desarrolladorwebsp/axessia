"use client";

import { useState } from "react";
import { FileText, Loader2, Upload } from "lucide-react";
import { PrimaryButton } from "../../components/Buttons";

type ClientDocument = { id: string; fileName: string; mimeType: string; fileSize: number; createdAt: string };

type GeneratedMandate = { fileName: string; sentAt: string | null } | null;

export default function ClientDocumentsCard({ requestId, initialDocuments, generatedMandate }: { requestId: string; initialDocuments: ClientDocument[]; generatedMandate: GeneratedMandate }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const uploadDocument = async () => {
    if (!file || isSaving) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("El documento no puede superar los 10 MB.");
      return;
    }
    try {
      setIsSaving(true);
      setError("");
      const response = await fetch(`/api/quote-requests/${requestId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type || "application/octet-stream", fileSize: file.size }),
      });
      const result = (await response.json()) as ClientDocument & { error?: string };
      if (!response.ok) throw new Error(result.error || "No fue posible asociar el documento.");
      setDocuments((current) => [result, ...current]);
      setFile(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "No fue posible asociar el documento.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mt-5 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[0_10px_28px_rgba(7,30,65,0.04)]">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--blue)]/10 text-[var(--blue)]"><FileText className="h-4 w-4" /></div>
        <div><h2 className="font-display text-base font-extrabold text-[var(--navy)]">Documentos</h2><p className="mt-0.5 text-xs text-[var(--text-secondary)]">Archivos asociados al cliente y a esta solicitud</p></div>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="min-w-0 cursor-pointer"><span className="block text-xs font-bold text-[var(--navy)]">Cargar documento del cliente</span><span className="mt-1 block truncate text-xs text-[var(--text-secondary)]">{file ? file.name : "PDF o imagen de hasta 10 MB"}</span><input type="file" accept="application/pdf,image/*" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(""); }} className="sr-only" /></label>
        <PrimaryButton size="sm" onClick={() => void uploadDocument()} disabled={!file || isSaving} icon={isSaving ? Loader2 : Upload} className={isSaving ? "[&_svg]:animate-spin" : ""}>{isSaving ? "Cargando..." : "Cargar documento"}</PrimaryButton>
      </div>
      {error && <p className="mt-3 text-xs font-semibold text-rose-600">{error}</p>}
      {generatedMandate && <a href={`/api/mandates/${requestId}/pdf`} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--blue)]/20 bg-blue-50/50 p-3 transition hover:border-[var(--blue)]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--blue)]"><FileText className="h-4 w-4" /></span><span className="min-w-0"><strong className="block truncate text-xs text-[var(--navy)]">{generatedMandate.fileName}</strong><span className="mt-0.5 block text-[10px] text-[var(--text-secondary)]">Mandato generado{generatedMandate.sentAt ? ` y enviado el ${new Date(generatedMandate.sentAt).toLocaleDateString("es-CL")}` : ""}</span></span></a>}
      {documents.length > 0 && <ul className="mt-4 divide-y divide-[var(--border)]">{documents.map((document) => <li key={document.id} className="flex items-center gap-3 py-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--purple)]/10 text-[var(--purple)]"><FileText className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-xs font-bold text-[var(--navy)]">{document.fileName}</p><p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">{document.mimeType} · {(document.fileSize / 1024).toFixed(1)} KB · {new Date(document.createdAt).toLocaleDateString("es-CL")}</p></div></li>)}</ul>}
    </section>
  );
}