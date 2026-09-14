"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import Modal from "../../components/Modal";
import { PrimaryButton, SecondaryButton } from "../../components/Buttons";

export type CustomerDocumentUploadCategory = "prescription" | "mandate" | "related";

type RequestOption = { id: string; requestNumber: string | null };

const copy: Record<CustomerDocumentUploadCategory, { title: string; description: string; action: string }> = {
  prescription: {
    title: "Agregar receta",
    description: "Asocia una receta médica a una solicitud de este cliente.",
    action: "Cargar receta",
  },
  mandate: {
    title: "Agregar mandato",
    description: "Adjunta el mandato firmado a una solicitud de este cliente.",
    action: "Cargar mandato",
  },
  related: {
    title: "Agregar documento relacionado",
    description: "Indica el nombre del documento y adjunta el archivo de respaldo.",
    action: "Cargar documento",
  },
};

export default function AddCustomerDocumentModal({
  open,
  category,
  customerId,
  requests,
  onClose,
  onUploaded,
}: {
  open: boolean;
  category: CustomerDocumentUploadCategory;
  customerId: string;
  requests: RequestOption[];
  onClose: () => void;
  onUploaded: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [requestId, setRequestId] = useState("");
  const [productName, setProductName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setRequestId(requests[0]?.id ?? "");
    setProductName("");
    setFile(null);
    setError("");
    setIsSaving(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [open, requests]);

  const submit = async () => {
    if (isSaving) return;
    if (!requestId) {
      setError("Selecciona la solicitud asociada.");
      return;
    }
    if (category === "related" && productName.trim().length < 2) {
      setError("Indica el nombre del documento.");
      return;
    }
    if (!file) {
      setError("Selecciona un archivo PDF o imagen de hasta 10 MB.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("El documento no puede superar los 10 MB.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);
      formData.append("requestId", requestId);
      if (category === "related") formData.append("productName", productName.trim());
      const response = await fetch(`/api/customers/${customerId}/documents`, { method: "POST", body: formData });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "No fue posible asociar el documento.");
      onUploaded();
      onClose();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "No fue posible asociar el documento.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !isSaving && onClose()}
      dismissible={!isSaving}
      title={copy[category].title}
      description={copy[category].description}
      maxWidthClassName="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <SecondaryButton size="sm" onClick={onClose} disabled={isSaving}>Cancelar</SecondaryButton>
          <PrimaryButton size="sm" onClick={() => void submit()} disabled={isSaving} icon={isSaving ? Loader2 : Upload} className={isSaving ? "[&_svg]:animate-spin" : ""}>
            {isSaving ? "Cargando..." : copy[category].action}
          </PrimaryButton>
        </div>
      }
    >
      {requests.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--text-secondary)]">
          Este cliente no tiene solicitudes. Crea una solicitud antes de asociar documentos.
        </p>
      ) : (
        <div className="space-y-4">
          <label className="block text-xs font-bold text-[var(--navy)]">
            Solicitud
            <select value={requestId} onChange={(event) => setRequestId(event.target.value)} className="field-input mt-2">
              {requests.map((request) => (
                <option key={request.id} value={request.id}>{request.requestNumber || "Sin número"}</option>
              ))}
            </select>
          </label>
          {category === "related" ? (
            <label className="block text-xs font-bold text-[var(--navy)]">
              Nombre del documento
              <input
                value={productName}
                onChange={(event) => {
                  setProductName(event.target.value);
                  setError("");
                }}
                maxLength={80}
                placeholder="Ej. Certificado médico, receta adicional"
                className="field-input mt-2"
              />
            </label>
          ) : null}
          <label className="block text-xs font-bold text-[var(--navy)]">
            Archivo
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError("");
              }}
              className="field-input mt-2"
            />
          </label>
          <p className="text-xs text-[var(--text-secondary)]">PDF o imagen de hasta 10 MB. El archivo se guardará con un nombre del sistema, por ejemplo Receta-AXESSIA-S-100012.pdf.</p>
        </div>
      )}
      {error ? <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p> : null}
    </Modal>
  );
}
