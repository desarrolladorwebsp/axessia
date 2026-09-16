"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Loader2, Pencil, Plus, Send, Trash2 } from "lucide-react";
import Modal from "../../components/Modal";
import { PrimaryButton, SecondaryButton } from "../../components/Buttons";
import { defaultQuoteValidUntilDate, formatLocalDate } from "@/lib/quote-items";
import { isMedicalDevice, type ProductType } from "@/lib/product-type";
import type { QuoteDetail } from "./ViewQuoteModal";
import QuoteProductModal from "./QuoteProductModal";
import {
  emptyItem,
  formatClp,
  isIncompleteQuoteLine,
  itemTypeLabel,
  lineAmount,
  newDraftClientId,
  quoteMoneyBreakdown,
  type DeviceSeed,
  type MedicationSeed,
  type QuoteDraftItem,
  type QuoteSupplierOption,
} from "./quote-draft";

export default function CreateQuoteModal({
  open,
  onClose,
  requestId,
  customerName,
  productType,
  medications,
  medicalDevices,
  editingQuote = null,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  requestId: string;
  customerName: string;
  productType: ProductType;
  medications: MedicationSeed[];
  medicalDevices: DeviceSeed[];
  editingQuote?: QuoteDetail | null;
  onCreated: (quote: QuoteDetail) => void;
}) {
  const isEditing = Boolean(editingQuote);
  const deviceQuote = isMedicalDevice(productType);
  const [items, setItems] = useState<QuoteDraftItem[]>([]);
  const [validUntil, setValidUntil] = useState("");
  const [estimatedShippingDays, setEstimatedShippingDays] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const initialSnapshot = useRef("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmStage, setConfirmStage] = useState<"idle" | "creating" | "sending" | "sent" | "create-error" | "send-error">("idle");
  const [confirmError, setConfirmError] = useState("");
  const [lastAction, setLastAction] = useState<"create" | "create-send">("create");
  const [createdQuote, setCreatedQuote] = useState<QuoteDetail | null>(null);
  const [suppliers, setSuppliers] = useState<QuoteSupplierOption[]>([]);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const seededItems: QuoteDraftItem[] = editingQuote
      ? editingQuote.items.map((item) => ({
          clientId: item.id || newDraftClientId(),
          productType: item.productType ?? productType,
          productName: item.productName,
          activeIngredient: item.activeIngredient ?? "",
          concentration: item.concentration ?? "",
          pharmaceuticalForm: item.pharmaceuticalForm ?? "",
          brand: item.brand ?? "",
          model: item.model ?? "",
          description: item.description ?? "",
          presentation: item.presentation ?? "",
          unitsPerPackage: item.unitsPerPackage != null ? String(item.unitsPerPackage) : "",
          supplierId: item.supplierId ?? item.supplier?.id ?? "",
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
      : deviceQuote
        ? medicalDevices.map((device) => emptyItem("MEDICAL_DEVICE", device))
        : medications.map((medication) => emptyItem("MEDICATION", medication));
    const defaultValidUntil = editingQuote?.validUntil ? editingQuote.validUntil.slice(0, 10) : defaultQuoteValidUntilDate();
    const defaultShippingDays = editingQuote?.estimatedShippingDays != null ? String(editingQuote.estimatedShippingDays) : "";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the draft form each time the modal opens
    setValidUntil(defaultValidUntil);
    setEstimatedShippingDays(defaultShippingDays);
    setNotes("");
    setItems(seededItems);
    setError("");
    setShowDiscardConfirm(false);
    setConfirmOpen(false);
    setConfirmStage("idle");
    setConfirmError("");
    setCreatedQuote(null);
    setProductModalOpen(false);
    setEditingItemId(null);
    initialSnapshot.current = JSON.stringify({ items: seededItems, validUntil: defaultValidUntil, estimatedShippingDays: defaultShippingDays, notes: "" });
  }, [open, productType, medications, medicalDevices, editingQuote, deviceQuote]);

  useEffect(() => {
    if (!open) return;
    const loadSuppliers = async () => {
      try {
        const response = await fetch("/api/suppliers?forSelect=1");
        const result = (await response.json()) as { suppliers?: QuoteSupplierOption[]; error?: string };
        if (!response.ok) throw new Error(result.error || "No fue posible cargar los proveedores");
        setSuppliers(result.suppliers ?? []);
      } catch {
        setSuppliers([]);
      }
    };
    void loadSuppliers();
  }, [open]);

  const removeItem = (clientId: string) => setItems((current) => current.filter((item) => item.clientId !== clientId));

  const { subtotal, iva, total } = quoteMoneyBreakdown(items);
  const isDirty = () => JSON.stringify({ items, validUntil, estimatedShippingDays, notes }) !== initialSnapshot.current;
  const isBusy = confirmStage === "creating" || confirmStage === "sending";
  const editingItem = items.find((item) => item.clientId === editingItemId) ?? null;

  const requestClose = () => {
    if (isSubmitting || isBusy) return;
    if (isDirty()) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  };

  const validateItemsForFinalize = () => {
    if (!items.length) return "Agrega al menos un producto a la cotización";
    const invalidItem = items.find((item) => !item.productName.trim() || !Number(item.quantity) || Number(item.quantity) <= 0 || item.unitPrice === "" || Number(item.unitPrice) < 0);
    if (invalidItem) return "Completa nombre, cantidad y precio unitario en todos los productos";
    if (items.some((item) => !item.supplierId)) return "Selecciona un proveedor en todos los productos";
    const days = Number(estimatedShippingDays);
    if (!estimatedShippingDays || !Number.isInteger(days) || days <= 0) return "Indica el tiempo estimado de envío en días hábiles";
    return "";
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
      body: JSON.stringify({
        requestId,
        validUntil: validUntil || null,
        estimatedShippingDays: estimatedShippingDays === "" ? null : Number(estimatedShippingDays),
        asDraft,
        items: buildItemsPayload(),
      }),
    });
    const result = (await response.json()) as { error?: string } & Partial<QuoteDetail>;
    if (!response.ok) throw new Error(result.error || (isEditing ? "No fue posible guardar los cambios" : "No fue posible guardar la cotización"));
    return result as QuoteDetail;
  };

  const submit = async (asDraft: boolean) => {
    if (isSubmitting) return;
    if (!items.length) {
      setError("Agrega al menos un producto para guardar el borrador");
      return;
    }
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

  const openAddProduct = () => {
    setEditingItemId(null);
    setProductModalOpen(true);
  };

  const openEditProduct = (clientId: string) => {
    setEditingItemId(clientId);
    setProductModalOpen(true);
  };

  const saveProduct = (item: QuoteDraftItem) => {
    setItems((current) => {
      const exists = current.some((row) => row.clientId === item.clientId);
      return exists ? current.map((row) => (row.clientId === item.clientId ? item : row)) : [...current, item];
    });
    setProductModalOpen(false);
    setEditingItemId(null);
    setError("");
  };

  return (
    <>
    <Modal
      open={open}
      onClose={requestClose}
      dismissible={false}
      title={isEditing ? "Editar cotización" : "Nueva cotización"}
      titleClassName="bg-gradient-to-r from-[var(--cyan)] via-[var(--blue)] to-[var(--purple)] bg-clip-text text-transparent"
      maxWidthClassName="max-w-5xl"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {error && <p className="mr-auto text-xs font-semibold text-rose-600">{error}</p>}
          <SecondaryButton size="sm" onClick={requestClose} disabled={isSubmitting}>Cancelar</SecondaryButton>
          <SecondaryButton size="sm" onClick={() => submit(true)} disabled={isSubmitting} icon={isSubmitting ? Loader2 : undefined} className={isSubmitting ? "[&_svg]:animate-spin" : ""}>
            Guardar borrador
          </SecondaryButton>
          <PrimaryButton size="sm" onClick={openConfirm} disabled={isSubmitting}>
            {isEditing ? "Guardar cambios" : "Crear cotización"}
          </PrimaryButton>
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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold text-[var(--text-secondary)]">{items.length} producto{items.length === 1 ? "" : "s"} en esta cotización</p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex flex-col gap-1 text-xs font-bold text-[var(--navy)] md:flex-row md:items-center md:gap-2">
            Tiempo estimado de envío
            <span className="text-rose-600" aria-hidden="true">*</span>
            <span className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="365"
                step="1"
                value={estimatedShippingDays}
                onChange={(event) => setEstimatedShippingDays(event.target.value)}
                placeholder="Ej: 10"
                required
                aria-required="true"
                className="block w-24 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-semibold outline-none focus:border-[var(--blue)]"
              />
              <span className="whitespace-nowrap text-[10px] font-semibold text-[var(--text-secondary)]">días hábiles</span>
            </span>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-[var(--navy)] md:flex-row md:items-center md:gap-2">
            Vence
            <span className="text-rose-600" aria-hidden="true">*</span>
            <input
              type="date"
              value={validUntil}
              min={formatLocalDate(new Date())}
              onChange={(event) => setValidUntil(event.target.value)}
              required
              aria-required="true"
              className="block rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-semibold outline-none focus:border-[var(--blue)]"
            />
          </label>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        <div className="hidden md:block">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                {["Nombre", "Tipo", "Cantidad", "Precio", "Total"].map((header) => (
                  <th key={header} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--navy)]">{header}</th>
                ))}
                <th className="w-28 px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-[var(--navy)]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-xs text-[var(--text-secondary)]">
                    Aún no hay productos en esta cotización. Agrega un medicamento o un equipo médico.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <motion.tr
                    key={item.clientId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]"
                  >
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold text-[var(--navy)]">{item.productName || "Sin nombre"}</p>
                      {isIncompleteQuoteLine(item) && (
                        <p className="mt-0.5 text-[10px] font-semibold text-amber-600">Faltan datos para finalizar</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-[var(--background)] px-2 py-0.5 text-[10px] font-bold text-[var(--blue)]">
                        {itemTypeLabel(item)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-[var(--navy)]">{item.quantity || "—"}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-[var(--navy)]">{item.unitPrice === "" ? "—" : formatClp(Number(item.unitPrice) || 0)}</td>
                    <td className="px-4 py-3 text-xs font-extrabold text-[var(--navy)]">{formatClp(lineAmount(item))}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" className="icon-button-small" onClick={() => openEditProduct(item.clientId)} aria-label={`Editar ${item.productName || "producto"}`} title="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className="icon-button-small" onClick={() => removeItem(item.clientId)} aria-label={`Eliminar ${item.productName || "producto"}`} title="Eliminar">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-[var(--border)] md:hidden">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-[var(--text-secondary)]">
              Aún no hay productos en esta cotización. Agrega un medicamento o un equipo médico.
            </p>
          ) : (
            items.map((item) => (
              <article key={item.clientId} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[var(--navy)]">{item.productName || "Sin nombre"}</p>
                    <p className="mt-1 text-[10px] font-bold text-[var(--blue)]">{itemTypeLabel(item)}</p>
                    <p className="mt-2 text-[11px] text-[var(--text-secondary)]">
                      Cant. {item.quantity || "—"} · Precio {item.unitPrice === "" ? "—" : formatClp(Number(item.unitPrice) || 0)}
                    </p>
                    <p className="mt-1 text-xs font-extrabold text-[var(--navy)]">{formatClp(lineAmount(item))}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" className="icon-button-small" onClick={() => openEditProduct(item.clientId)} aria-label={`Editar ${item.productName || "producto"}`} title="Editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" className="icon-button-small" onClick={() => removeItem(item.clientId)} aria-label={`Eliminar ${item.productName || "producto"}`} title="Eliminar">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <button type="button" onClick={openAddProduct} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-dashed border-[var(--purple)] px-3 py-2 text-xs font-bold text-[var(--purple)] transition hover:bg-violet-50">
        <Plus className="h-3.5 w-3.5" />Agregar
      </button>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
          Observación
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Notas internas de esta cotización"
            className="field-input mt-1 min-h-[84px] resize-y"
          />
        </label>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Total</span>
            <span className="font-semibold text-[var(--navy)]">{formatClp(subtotal)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>IVA (19%)</span>
            <span className="font-semibold text-[var(--navy)]">{formatClp(iva)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
            <span className="text-xs font-extrabold text-[var(--navy)]">Total cotización</span>
            <span className="text-sm font-extrabold text-[var(--navy)]">{formatClp(total)}</span>
          </div>
        </div>
      </div>
    </Modal>

    <QuoteProductModal
      open={productModalOpen}
      editingItem={editingItem}
      defaultProductType={productType}
      medications={medications}
      medicalDevices={medicalDevices}
      existingItems={items}
      suppliers={suppliers}
      onClose={() => {
        setProductModalOpen(false);
        setEditingItemId(null);
      }}
      onSave={saveProduct}
    />

    <Modal
      open={confirmOpen}
      onClose={cancelConfirm}
      dismissible={false}
      title={isEditing ? "Confirmar cambios de la cotización" : "Confirmar creación de cotización"}
      description={`Cliente: ${customerName} · Total cotización: ${formatClp(total)}`}
      maxWidthClassName="max-w-md"
      zClassName="z-[70]"
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
