"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Loader2, Plus, Send, Trash2 } from "lucide-react";
import Modal from "../../components/Modal";
import { PrimaryButton, SecondaryButton } from "../../components/Buttons";
import type { QuoteDetail } from "./ViewQuoteModal";

type MedicationSeed = { commercialName: string; activeIngredient: string; concentration: string; tabletQuantity: number };

export type QuoteDraftItem = {
  productName: string;
  activeIngredient: string;
  concentration: string;
  pharmaceuticalForm: string;
  presentation: string;
  unitsPerPackage: string;
  manufacturer: string;
  originCountry: string;
  supplierCountry: string;
  quantity: string;
  sanitaryRegistry: string;
  condition: "" | "AVAILABLE" | "SPECIAL_IMPORT";
  batchNumber: string;
  expirationDate: string;
  unitPrice: string;
};

const emptyItem = (seed?: MedicationSeed): QuoteDraftItem => ({
  productName: seed?.commercialName ?? "",
  activeIngredient: seed?.activeIngredient ?? "",
  concentration: seed?.concentration ?? "",
  pharmaceuticalForm: "",
  presentation: "",
  unitsPerPackage: seed ? String(seed.tabletQuantity) : "",
  manufacturer: "",
  originCountry: "",
  supplierCountry: "",
  quantity: "1",
  sanitaryRegistry: "",
  condition: "",
  batchNumber: "",
  expirationDate: "",
  unitPrice: "",
});

const pharmaceuticalForms = ["Comprimido", "Cápsula", "Ampolla", "Solución", "Jarabe", "Crema", "Otro"];

export default function CreateQuoteModal({
  open,
  onClose,
  requestId,
  customerName,
  medications,
  editingQuote = null,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  requestId: string;
  customerName: string;
  medications: MedicationSeed[];
  editingQuote?: QuoteDetail | null;
  onCreated: (quote: QuoteDetail) => void;
}) {
  const isEditing = Boolean(editingQuote);
  const [items, setItems] = useState<QuoteDraftItem[]>([emptyItem()]);
  const [validUntil, setValidUntil] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const initialSnapshot = useRef("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmStage, setConfirmStage] = useState<"idle" | "creating" | "sending" | "sent" | "create-error" | "send-error">("idle");
  const [confirmError, setConfirmError] = useState("");
  const [lastAction, setLastAction] = useState<"create" | "create-send">("create");
  const [createdQuote, setCreatedQuote] = useState<QuoteDetail | null>(null);

  useEffect(() => {
    if (!open) return;
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    const seededItems: QuoteDraftItem[] = editingQuote
      ? editingQuote.items.map((item) => ({
          productName: item.productName,
          activeIngredient: item.activeIngredient ?? "",
          concentration: item.concentration ?? "",
          pharmaceuticalForm: item.pharmaceuticalForm ?? "",
          presentation: item.presentation ?? "",
          unitsPerPackage: item.unitsPerPackage != null ? String(item.unitsPerPackage) : "",
          manufacturer: item.manufacturer ?? "",
          originCountry: item.originCountry ?? "",
          supplierCountry: item.supplierCountry ?? "",
          quantity: String(item.quantity),
          sanitaryRegistry: item.sanitaryRegistry ?? "",
          condition: item.condition ?? "",
          batchNumber: item.batchNumber ?? "",
          expirationDate: item.expirationDate ? item.expirationDate.slice(0, 10) : "",
          unitPrice: item.unitPrice != null ? String(item.unitPrice) : "",
        }))
      : medications.length
        ? medications.map((medication) => emptyItem(medication))
        : [emptyItem()];
    const defaultValidUntil = editingQuote?.validUntil ? editingQuote.validUntil.slice(0, 10) : defaultDate.toISOString().slice(0, 10);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the draft form each time the modal opens
    setValidUntil(defaultValidUntil);
    setItems(seededItems);
    setError("");
    setShowDiscardConfirm(false);
    setConfirmOpen(false);
    setConfirmStage("idle");
    setConfirmError("");
    setCreatedQuote(null);
    initialSnapshot.current = JSON.stringify({ items: seededItems, validUntil: defaultValidUntil });
  }, [open, medications, editingQuote]);

  const updateItem = (index: number, patch: Partial<QuoteDraftItem>) => {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const addItem = () => setItems((current) => [...current, emptyItem()]);
  const removeItem = (index: number) => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));

  const total = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  const isDirty = () => JSON.stringify({ items, validUntil }) !== initialSnapshot.current;
  const isBusy = confirmStage === "creating" || confirmStage === "sending";

  const requestClose = () => {
    if (isSubmitting || isBusy) return;
    if (isDirty()) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  };

  const validateItemsForFinalize = () => {
    const invalidItem = items.find((item) => !item.productName.trim() || !Number(item.quantity) || Number(item.quantity) <= 0 || item.unitPrice === "" || Number(item.unitPrice) < 0);
    return invalidItem ? "Completa nombre comercial, cantidad solicitada y precio unitario en todos los productos" : "";
  };

  const buildItemsPayload = () =>
    items.map((item) => ({
      ...item,
      quantity: item.quantity === "" ? 0 : Number(item.quantity),
      unitsPerPackage: item.unitsPerPackage === "" ? null : Number(item.unitsPerPackage),
      unitPrice: item.unitPrice === "" ? null : Number(item.unitPrice),
      condition: item.condition || null,
      expirationDate: item.expirationDate || null,
    }));

  const saveQuote = async (asDraft: boolean): Promise<QuoteDetail> => {
    const endpoint = isEditing ? `/api/quotes/${editingQuote!.id}` : "/api/quotes";
    const response = await fetch(endpoint, {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, validUntil: validUntil || null, asDraft, items: buildItemsPayload() }),
    });
    const result = (await response.json()) as { error?: string } & Partial<QuoteDetail>;
    if (!response.ok) throw new Error(result.error || (isEditing ? "No fue posible guardar los cambios" : "No fue posible guardar la cotización"));
    return result as QuoteDetail;
  };

  const submit = async (asDraft: boolean) => {
    if (isSubmitting) return;
    if (asDraft && items.some((item) => !item.productName.trim())) {
      setError("Cada producto necesita al menos un nombre comercial para guardarse como borrador");
      return;
    }
    try {
      setIsSubmitting(true);
      setError("");
      const quote = await saveQuote(asDraft);
      onCreated(quote);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No fue posible guardar la cotización");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openConfirm = () => {
    const validationError = validateItemsForFinalize();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setConfirmStage("idle");
    setConfirmError("");
    setConfirmOpen(true);
  };

  const createFinalQuote = (): Promise<QuoteDetail> => saveQuote(false);


  const sendCreatedQuote = async (quoteId: string) => {
    const response = await fetch(`/api/quotes/${quoteId}/send`, { method: "POST" });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(result.error || "No fue posible enviar la cotización al cliente");
  };

  const closeEverything = () => {
    setConfirmOpen(false);
    setConfirmStage("idle");
    setConfirmError("");
    setCreatedQuote(null);
    onClose();
  };

  const cancelConfirm = () => {
    if (isBusy) return;
    setConfirmOpen(false);
    setConfirmStage("idle");
    setConfirmError("");
  };

  const handleConfirmCreateOnly = async () => {
    if (isBusy) return;
    setLastAction("create");
    setConfirmStage("creating");
    setConfirmError("");
    try {
      const quote = await createFinalQuote();
      setCreatedQuote(quote);
      onCreated(quote);
      closeEverything();
    } catch (createError) {
      setConfirmStage("create-error");
      setConfirmError(createError instanceof Error ? createError.message : (isEditing ? "No fue posible guardar los cambios" : "No fue posible crear la cotización"));
    }
  };

  const handleConfirmCreateAndSend = async () => {
    if (isBusy) return;
    setLastAction("create-send");
    let quote = createdQuote;
    if (!quote) {
      setConfirmStage("creating");
      setConfirmError("");
      try {
        quote = await createFinalQuote();
        setCreatedQuote(quote);
        onCreated(quote);
      } catch (createError) {
        setConfirmStage("create-error");
        setConfirmError(createError instanceof Error ? createError.message : (isEditing ? "No fue posible guardar los cambios" : "No fue posible crear la cotización"));
        return;
      }
    }
    setConfirmStage("sending");
    setConfirmError("");
    try {
      await sendCreatedQuote(quote.id);
      setConfirmStage("sent");
    } catch (sendError) {
      setConfirmStage("send-error");
      setConfirmError(sendError instanceof Error ? sendError.message : "No fue posible enviar la cotización al cliente");
    }
  };

  const retryConfirm = () => {
    if (isBusy) return;
    if (confirmStage === "create-error") {
      if (lastAction === "create") {
        handleConfirmCreateOnly();
      } else {
        handleConfirmCreateAndSend();
      }
    } else if (confirmStage === "send-error") {
      handleConfirmCreateAndSend();
    }
  };

  return (
    <>
    <Modal
      open={open}
      onClose={requestClose}
      dismissible={false}
      title={isEditing ? "Editar cotización" : "Nueva cotización"}
      description={isEditing ? `Cliente: ${customerName} · ${editingQuote?.quoteNumber || `Borrador v${editingQuote?.version}`}` : `Cliente: ${customerName} · Número generado automáticamente`}
      maxWidthClassName="max-w-5xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-extrabold text-[var(--navy)]">Total: ${total.toLocaleString("es-CL")}</p>
          <div className="flex flex-wrap items-center gap-2">
            {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
            <SecondaryButton size="sm" onClick={requestClose} disabled={isSubmitting}>Cancelar</SecondaryButton>
            <SecondaryButton size="sm" onClick={() => submit(true)} disabled={isSubmitting} icon={isSubmitting ? Loader2 : undefined} className={isSubmitting ? "[&_svg]:animate-spin" : ""}>
              Guardar borrador
            </SecondaryButton>
            <PrimaryButton size="sm" onClick={openConfirm} disabled={isSubmitting}>
              {isEditing ? "Guardar cambios" : "Crear cotización"}
            </PrimaryButton>
          </div>
        </div>
      }
    >
      <AnimatePresence>
        {showDiscardConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[var(--navy-dark)]/40 p-5 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-[0_20px_60px_rgba(7,30,65,0.25)]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-[var(--navy)]">¿Descartar esta cotización?</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">Hay información ingresada que aún no se ha guardado. Puedes guardarla como borrador para continuar más tarde.</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <SecondaryButton size="sm" onClick={() => setShowDiscardConfirm(false)}>Seguir editando</SecondaryButton>
                <PrimaryButton size="sm" onClick={() => { setShowDiscardConfirm(false); onClose(); }}>Descartar cambios</PrimaryButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold text-[var(--text-secondary)]">{items.length} producto{items.length === 1 ? "" : "s"} en esta cotización</p>
        <label className="text-xs font-bold text-[var(--navy)]">
          Vence
          <input
            type="date"
            value={validUntil}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setValidUntil(event.target.value)}
            className="mt-1 block rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-semibold outline-none focus:border-[var(--blue)]"
          />
        </label>
      </div>

      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {items.map((item, index) => (
            <motion.div
              key={index}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">Producto {index + 1}</p>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(index)} className="icon-button-small" aria-label={`Eliminar producto ${index + 1}`} title="Eliminar producto">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Nombre comercial">
                  <input value={item.productName} onChange={(event) => updateItem(index, { productName: event.target.value })} className="field-input" />
                </Field>
                <Field label="Principio activo">
                  <input value={item.activeIngredient} onChange={(event) => updateItem(index, { activeIngredient: event.target.value })} className="field-input" />
                </Field>
                <Field label="Concentración">
                  <input value={item.concentration} onChange={(event) => updateItem(index, { concentration: event.target.value })} className="field-input" />
                </Field>
                <Field label="Forma farmacéutica">
                  <select value={item.pharmaceuticalForm} onChange={(event) => updateItem(index, { pharmaceuticalForm: event.target.value })} className="field-input">
                    <option value="">Seleccionar</option>
                    {pharmaceuticalForms.map((form) => <option key={form} value={form}>{form}</option>)}
                  </select>
                </Field>

                <Field label="Presentación">
                  <input value={item.presentation} onChange={(event) => updateItem(index, { presentation: event.target.value })} placeholder="Caja de 30 comprimidos" className="field-input" />
                </Field>
                <Field label="Unidades por presentación">
                  <input type="number" min="1" value={item.unitsPerPackage} onChange={(event) => updateItem(index, { unitsPerPackage: event.target.value })} placeholder="30" className="field-input" />
                </Field>
                <Field label="Laboratorio / fabricante">
                  <input value={item.manufacturer} onChange={(event) => updateItem(index, { manufacturer: event.target.value })} className="field-input" />
                </Field>
                <Field label="País de origen">
                  <input value={item.originCountry} onChange={(event) => updateItem(index, { originCountry: event.target.value })} className="field-input" />
                </Field>

                <Field label="País del proveedor">
                  <input value={item.supplierCountry} onChange={(event) => updateItem(index, { supplierCountry: event.target.value })} className="field-input" />
                </Field>
                <Field label="Registro sanitario">
                  <input value={item.sanitaryRegistry} onChange={(event) => updateItem(index, { sanitaryRegistry: event.target.value })} placeholder="Si corresponde" className="field-input" />
                </Field>
                <Field label="Condición">
                  <select value={item.condition} onChange={(event) => updateItem(index, { condition: event.target.value as QuoteDraftItem["condition"] })} className="field-input">
                    <option value="">Seleccionar</option>
                    <option value="AVAILABLE">Medicamento disponible</option>
                    <option value="SPECIAL_IMPORT">Importación especial</option>
                  </select>
                </Field>
                <Field label="Lote">
                  <input value={item.batchNumber} onChange={(event) => updateItem(index, { batchNumber: event.target.value })} placeholder="Si ya está identificado" className="field-input" />
                </Field>

                <Field label="Fecha de vencimiento">
                  <input type="date" value={item.expirationDate} onChange={(event) => updateItem(index, { expirationDate: event.target.value })} className="field-input" />
                </Field>
                <Field label="Cantidad solicitada">
                  <input type="number" min="1" value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} className="field-input" />
                </Field>
                <Field label="Precio unitario">
                  <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(index, { unitPrice: event.target.value })} className="field-input" />
                </Field>
                <div className="flex flex-col justify-end">
                  <p className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">Subtotal</p>
                  <p className="text-sm font-extrabold text-[var(--navy)]">${((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)).toLocaleString("es-CL")}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button type="button" onClick={addItem} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-dashed border-[var(--purple)] px-3 py-2 text-xs font-bold text-[var(--purple)] transition hover:bg-violet-50">
        <Plus className="h-3.5 w-3.5" />Agregar producto
      </button>
    </Modal>

    <Modal
      open={confirmOpen}
      onClose={cancelConfirm}
      dismissible={false}
      title={isEditing ? "Confirmar cambios de la cotización" : "Confirmar creación de cotización"}
      description={`Cliente: ${customerName} · Total: $${total.toLocaleString("es-CL")}`}
      maxWidthClassName="max-w-md"
      footer={
        confirmStage === "idle" ? (
          <div className="flex flex-wrap justify-end gap-2">
            <SecondaryButton size="sm" onClick={cancelConfirm}>Cancelar</SecondaryButton>
            <SecondaryButton size="sm" onClick={handleConfirmCreateOnly}>{isEditing ? "Guardar cambios" : "Crear cotización"}</SecondaryButton>
            <PrimaryButton size="sm" onClick={handleConfirmCreateAndSend} icon={Send}>{isEditing ? "Guardar y enviar al cliente" : "Crear y enviar al cliente"}</PrimaryButton>
          </div>
        ) : confirmStage === "create-error" ? (
          <div className="flex flex-wrap justify-end gap-2">
            <SecondaryButton size="sm" onClick={cancelConfirm}>Cancelar</SecondaryButton>
            <PrimaryButton size="sm" onClick={retryConfirm}>Reintentar</PrimaryButton>
          </div>
        ) : confirmStage === "send-error" ? (
          <div className="flex flex-wrap justify-end gap-2">
            <SecondaryButton size="sm" onClick={closeEverything}>Cerrar</SecondaryButton>
            <PrimaryButton size="sm" onClick={retryConfirm} icon={Send}>Reintentar envío</PrimaryButton>
          </div>
        ) : confirmStage === "sent" ? (
          <div className="flex justify-end">
            <PrimaryButton size="sm" onClick={closeEverything}>Cerrar</PrimaryButton>
          </div>
        ) : null
      }
    >
      {confirmStage === "idle" && (
        <p className="text-sm text-[var(--text-secondary)]">
          {isEditing
            ? "Elige si deseas guardar los cambios solamente, o guardarlos y enviar la cotización actualizada al cliente por correo."
            : "Elige si deseas registrar la cotización solamente, o registrarla y enviarla de inmediato al cliente por correo."}
        </p>
      )}
      {(confirmStage === "creating" || confirmStage === "sending") && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--blue)]" />
          <p className="text-sm font-semibold text-[var(--navy)]">{confirmStage === "creating" ? (isEditing ? "Guardando cambios..." : "Creando cotización...") : "Enviando cotización al cliente..."}</p>
        </div>
      )}
      {confirmStage === "sent" && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          <p className="text-sm font-semibold text-[var(--navy)]">{isEditing ? "Cambios guardados y cotización enviada al cliente correctamente." : "Cotización creada y enviada al cliente correctamente."}</p>
        </div>
      )}
      {confirmStage === "create-error" && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <p className="text-xs font-semibold text-rose-700">{confirmError}</p>
        </div>
      )}
      {confirmStage === "send-error" && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs font-semibold text-amber-700">La cotización quedó registrada, pero {confirmError.toLowerCase()}</p>
        </div>
      )}
    </Modal>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-bold uppercase text-[var(--text-secondary)]">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
