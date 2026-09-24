"use client";

import { useEffect, useMemo, useState } from "react";
import { HeartPulse, List, Pill, Plus, Search } from "lucide-react";
import Modal from "../../components/Modal";
import { PrimaryButton, SecondaryButton } from "../../components/Buttons";
import { isMedicalDevice, type ProductType } from "@/lib/product-type";
import {
  cloneDraftItem,
  emptyItem,
  pharmaceuticalForms,
  type DeviceSeed,
  type MedicationSeed,
  type QuoteDraftItem,
  type QuoteSupplierOption,
} from "./quote-draft";

type ProductSuggestion = {
  key: string;
  source: "request" | "quote" | "catalog";
  item: QuoteDraftItem;
};

type CatalogProduct = {
  id: string;
  productType: ProductType;
  productName: string;
  activeIngredient: string | null;
  concentration: string | null;
  pharmaceuticalForm: string | null;
  brand: string | null;
  model: string | null;
  description: string | null;
  presentation: string | null;
  unitsPerPackage: number | null;
  manufacturer: string | null;
  originCountry: string | null;
  supplierCountry: string | null;
  supplierId: string | null;
  sanitaryRegistry: string | null;
  condition: "AVAILABLE" | "SPECIAL_IMPORT" | null;
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-bold uppercase text-[var(--text-secondary)]">
      {label}
      {required ? <span className="ml-0.5 text-rose-600" aria-hidden="true">*</span> : null}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function matchesQuery(item: QuoteDraftItem, query: string) {
  const haystack = [
    item.productName,
    item.activeIngredient,
    item.concentration,
    item.brand,
    item.model,
    item.description,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function catalogDetail(item: QuoteDraftItem, device: boolean) {
  if (device) return [item.brand, item.model].filter(Boolean).join(" · ") || "—";
  return item.concentration.trim() || item.pharmaceuticalForm || "—";
}

function productDetail(item: QuoteDraftItem, device: boolean) {
  return device
    ? [item.brand, item.model].filter(Boolean).join(" · ") || "Equipo médico"
    : [item.activeIngredient, item.concentration].filter(Boolean).join(" · ") || "Medicamento";
}

function sourceLabel(source: ProductSuggestion["source"]) {
  if (source === "request") return "Solicitud";
  if (source === "quote") return "En esta cotización";
  return "Catálogo";
}

function supplierName(item: QuoteDraftItem, suppliers: QuoteSupplierOption[]) {
  if (!item.supplierId) return "—";
  return suppliers.find((option) => option.id === item.supplierId)?.name || "—";
}

function activeIngredientLabel(item: QuoteDraftItem) {
  return item.activeIngredient.trim() || "—";
}

export default function QuoteProductModal({
  open,
  editingItem,
  defaultProductType,
  medications,
  medicalDevices,
  existingItems,
  suppliers,
  onClose,
  onSave,
}: {
  open: boolean;
  editingItem: QuoteDraftItem | null;
  defaultProductType: ProductType;
  medications: MedicationSeed[];
  medicalDevices: DeviceSeed[];
  existingItems: QuoteDraftItem[];
  suppliers: QuoteSupplierOption[];
  onClose: () => void;
  onSave: (item: QuoteDraftItem) => void;
}) {
  const isEditing = Boolean(editingItem);
  const [productType, setProductType] = useState<ProductType | null>(editingItem?.productType ?? null);
  const [draft, setDraft] = useState<QuoteDraftItem>(editingItem ?? emptyItem(defaultProductType));
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [registeredProducts, setRegisteredProducts] = useState<CatalogProduct[]>([]);

  useEffect(() => {
    if (!open) return;
    setError("");
    setQuery("");
    setCatalogOpen(false);
    setRegisteredProducts([]);
    if (editingItem) {
      setProductType(editingItem.productType);
      setDraft(editingItem);
      return;
    }
    setProductType(null);
    setDraft(emptyItem(defaultProductType));
  }, [open, editingItem, defaultProductType]);

  useEffect(() => {
    if (!open || !productType) return;
    let cancelled = false;
    const loadProducts = async () => {
      try {
        const response = await fetch(`/api/products?productType=${productType}`, { cache: "no-store" });
        const result = await response.json() as { products?: CatalogProduct[] };
        if (!cancelled) setRegisteredProducts(response.ok ? result.products ?? [] : []);
      } catch {
        if (!cancelled) setRegisteredProducts([]);
      }
    };
    void loadProducts();
    return () => { cancelled = true; };
  }, [open, productType]);

  const device = isMedicalDevice(productType ?? defaultProductType);

  const catalog = useMemo(() => {
    if (!productType) return [];
    const requestItems: ProductSuggestion[] = isMedicalDevice(productType)
      ? medicalDevices.map((seed, index) => ({
          key: `request-device-${index}-${seed.name}`,
          source: "request" as const,
          item: emptyItem("MEDICAL_DEVICE", seed),
        }))
      : medications.map((seed, index) => ({
          key: `request-med-${index}-${seed.commercialName}`,
          source: "request" as const,
          item: emptyItem("MEDICATION", seed),
        }));

    const quoteItems: ProductSuggestion[] = existingItems
      .filter((item) => item.productType === productType && item.clientId !== editingItem?.clientId && item.productName.trim())
      .map((item) => ({
        key: `quote-${item.clientId}`,
        source: "quote" as const,
        item,
      }));

    const savedProducts: ProductSuggestion[] = registeredProducts.map((product) => ({
      key: `catalog-${product.id}`,
      source: "catalog",
      item: {
        ...emptyItem(product.productType),
        productId: product.id,
        productType: product.productType,
        productName: product.productName,
        activeIngredient: product.activeIngredient ?? "",
        concentration: product.concentration ?? "",
        pharmaceuticalForm: product.pharmaceuticalForm ?? "",
        brand: product.brand ?? "",
        model: product.model ?? "",
        description: product.description ?? "",
        presentation: product.presentation ?? "",
        unitsPerPackage: product.unitsPerPackage == null ? "" : String(product.unitsPerPackage),
        supplierId: product.supplierId ?? "",
        manufacturer: product.manufacturer ?? "",
        originCountry: product.originCountry ?? "",
        supplierCountry: product.supplierCountry ?? "",
        sanitaryRegistry: product.sanitaryRegistry ?? "",
        condition: product.condition ?? "",
      },
    }));

    return [...savedProducts, ...requestItems, ...quoteItems];
  }, [productType, medicalDevices, medications, existingItems, registeredProducts, editingItem?.clientId]);

  const searchResults = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];
    return catalog.filter((suggestion) => matchesQuery(suggestion.item, normalizedQuery)).slice(0, 8);
  }, [catalog, query]);

  const isSearching = Boolean(query.trim());

  const updateDraft = (patch: Partial<QuoteDraftItem>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const assignSupplier = (supplierId: string) => {
    const supplier = suppliers.find((option) => option.id === supplierId);
    updateDraft({
      supplierId,
      manufacturer: supplier?.manufacturer ?? "",
      originCountry: supplier?.originCountry ?? "",
      supplierCountry: supplier?.country ?? "",
    });
  };

  const selectType = (nextType: ProductType) => {
    setProductType(nextType);
    setQuery("");
    setCatalogOpen(false);
    setDraft(emptyItem(nextType));
  };

  const applySuggestion = (suggestion: ProductSuggestion) => {
    const next = suggestion.source === "quote" ? cloneDraftItem(suggestion.item) : suggestion.item;
    setDraft({
      ...next,
      clientId: editingItem?.clientId ?? next.clientId,
    });
    setQuery("");
    setCatalogOpen(false);
    setError("");
  };

  const save = () => {
    if (!productType) {
      setError("Selecciona si vas a agregar un medicamento o un equipo médico");
      return;
    }
    if (!draft.productName.trim()) {
      setError(device ? "Indica el nombre del equipo médico" : "Indica el nombre comercial");
      return;
    }
    onSave({ ...draft, productType, clientId: editingItem?.clientId ?? draft.clientId });
  };

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!catalogOpen}
      title={isEditing ? "Editar producto" : "Agregar producto"}
      description={isEditing ? "Actualiza los datos de esta línea en la cotización." : "Elige el tipo de producto y completa la información para incluirlo en la cotización."}
      maxWidthClassName="max-w-3xl"
      zClassName="z-[60]"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : <span />}
          <div className="flex flex-wrap items-center gap-2">
            <SecondaryButton size="sm" onClick={onClose}>Cancelar</SecondaryButton>
            <PrimaryButton size="sm" onClick={save} disabled={!productType}>
              {isEditing ? "Guardar cambios" : "Agregar a la cotización"}
            </PrimaryButton>
          </div>
        </div>
      }
    >
      {!productType ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <TypeChoice
            icon={Pill}
            title="Medicamento"
            description="Nombre comercial, principio activo, presentación y proveedor."
            onClick={() => selectType("MEDICATION")}
          />
          <TypeChoice
            icon={HeartPulse}
            title="Equipo médico"
            description="Nombre del dispositivo, marca, modelo y proveedor."
            onClick={() => selectType("MEDICAL_DEVICE")}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                <span className="sr-only">Buscar producto</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={device ? "Buscar equipo médico" : "Buscar medicamento"}
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-xs outline-none transition focus:border-[var(--blue)] focus:ring-4 focus:ring-[var(--blue)]/10"
                />
              </label>
              <SecondaryButton size="sm" icon={List} onClick={() => setCatalogOpen(true)}>
                Mostrar productos
              </SecondaryButton>
            </div>

            {isSearching && (
              <div className="mt-2 overflow-hidden rounded-xl border border-[var(--border)] bg-white">
                {searchResults.length ? (
                  <ul className="divide-y divide-[var(--border)]">
                    {searchResults.map((suggestion) => (
                      <li key={suggestion.key}>
                        <ProductPickButton suggestion={suggestion} device={device} onSelect={applySuggestion} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-3 py-4">
                    <p className="text-xs font-semibold text-[var(--navy)]">No encontramos este producto</p>
                    <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                      Completa los datos abajo o registra primero el producto desde el menú Productos para conservar su costo interno.
                    </p>
                  </div>
                )}
                <div className="border-t border-[var(--border)] bg-[var(--background)] px-3 py-2">
                  <button
                    type="button"
                    disabled
                    title="Registra productos desde el menú Productos"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-secondary)] opacity-60"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Crear producto en catálogo
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={device ? "Nombre del dispositivo" : "Nombre comercial"} required>
              <input value={draft.productName} onChange={(event) => updateDraft({ productName: event.target.value })} className="field-input" required aria-required="true" />
            </Field>
            {device ? (
              <>
                <Field label="Marca">
                  <input value={draft.brand} onChange={(event) => updateDraft({ brand: event.target.value })} className="field-input" />
                </Field>
                <Field label="Modelo o referencia">
                  <input value={draft.model} onChange={(event) => updateDraft({ model: event.target.value })} className="field-input" />
                </Field>
                <Field label="Descripción o características">
                  <input value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} className="field-input" />
                </Field>
              </>
            ) : (
              <>
                <Field label="Principio activo">
                  <input value={draft.activeIngredient} onChange={(event) => updateDraft({ activeIngredient: event.target.value })} className="field-input" />
                </Field>
                <Field label="Concentración">
                  <input value={draft.concentration} onChange={(event) => updateDraft({ concentration: event.target.value })} className="field-input" />
                </Field>
                <Field label="Forma farmacéutica">
                  <select value={draft.pharmaceuticalForm} onChange={(event) => updateDraft({ pharmaceuticalForm: event.target.value })} className="field-input">
                    <option value="">Seleccionar</option>
                    {pharmaceuticalForms.map((form) => (
                      <option key={form} value={form}>{form}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Presentación">
                  <input value={draft.presentation} onChange={(event) => updateDraft({ presentation: event.target.value })} placeholder="Caja de 30 comprimidos" className="field-input" />
                </Field>
                <Field label="Unidades por presentación">
                  <input type="number" min="1" value={draft.unitsPerPackage} onChange={(event) => updateDraft({ unitsPerPackage: event.target.value })} placeholder="30" className="field-input" />
                </Field>
              </>
            )}

            <p className="sm:col-span-2 text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Proveedor · uso interno, no visible para el cliente</p>
            <Field label="Proveedor" required>
              <select value={draft.supplierId} onChange={(event) => assignSupplier(event.target.value)} className="field-input" required aria-required="true">
                <option value="">{suppliers.length ? "Seleccionar proveedor" : "Sin proveedores registrados"}</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Registro sanitario">
              <input value={draft.sanitaryRegistry} onChange={(event) => updateDraft({ sanitaryRegistry: event.target.value })} placeholder="Si corresponde" className="field-input" />
            </Field>
            <Field label="Condición">
              <select value={draft.condition} onChange={(event) => updateDraft({ condition: event.target.value as QuoteDraftItem["condition"] })} className="field-input">
                <option value="">Seleccionar</option>
                <option value="AVAILABLE">{device ? "Dispositivo disponible" : "Medicamento disponible"}</option>
                <option value="SPECIAL_IMPORT">Importación especial</option>
              </select>
            </Field>
            <Field label="Lote">
              <input value={draft.batchNumber} onChange={(event) => updateDraft({ batchNumber: event.target.value })} placeholder="Si ya está identificado" className="field-input" />
            </Field>
            <Field label="Fecha de vencimiento">
              <input type="date" value={draft.expirationDate} onChange={(event) => updateDraft({ expirationDate: event.target.value })} className="field-input" />
            </Field>
            <Field label="Cantidad" required>
              <input type="number" min="1" value={draft.quantity} onChange={(event) => updateDraft({ quantity: event.target.value })} className="field-input" required aria-required="true" />
            </Field>
            <Field label="Precio unitario" required>
              <input type="number" min="0" step="0.01" value={draft.unitPrice} onChange={(event) => updateDraft({ unitPrice: event.target.value })} className="field-input" required aria-required="true" />
            </Field>
          </div>
        </div>
      )}
    </Modal>

    <Modal
      open={catalogOpen}
      onClose={() => setCatalogOpen(false)}
      title={device ? "Productos · equipo médico" : "Productos · medicamento"}
      description="Selecciona un producto para cargar sus datos en el formulario. Luego puedes ajustarlos si hace falta."
      maxWidthClassName="max-w-4xl"
      zClassName="z-[70]"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled
            title="Registra productos desde el menú Productos"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-secondary)] opacity-60"
          >
            <Plus className="h-3.5 w-3.5" />
            Crear producto en catálogo
          </button>
          <SecondaryButton size="sm" onClick={() => setCatalogOpen(false)}>Cerrar</SecondaryButton>
        </div>
      }
    >
      {catalog.length === 0 ? (
        <p className="py-6 text-center text-xs text-[var(--text-secondary)]">
          Aún no hay productos registrados de este tipo. Completa los datos en el formulario o créalo primero desde Productos.
        </p>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-[var(--border)] md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--navy)]">Nombre</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--navy)]">Componente activo</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--navy)]">Detalle</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--navy)]">Proveedor</th>
                  <th className="w-28 px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-[var(--navy)]">Acción</th>
                </tr>
              </thead>
              <tbody>
                {catalog.map((suggestion) => (
                  <tr key={suggestion.key} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]">
                    <td className="px-4 py-3 text-xs font-bold text-[var(--navy)]">{suggestion.item.productName}</td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{activeIngredientLabel(suggestion.item)}</td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{catalogDetail(suggestion.item, device)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-[var(--blue)]">{supplierName(suggestion.item, suppliers)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => applySuggestion(suggestion)}
                        className="text-xs font-bold text-[var(--blue)] transition hover:text-[var(--navy)]"
                      >
                        Seleccionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] md:hidden">
            {catalog.map((suggestion) => (
              <button
                key={suggestion.key}
                type="button"
                onClick={() => applySuggestion(suggestion)}
                className="flex w-full items-start justify-between gap-3 p-4 text-left"
              >
                <span>
                  <span className="block text-xs font-bold text-[var(--navy)]">{suggestion.item.productName}</span>
                  <span className="mt-0.5 block text-[10px] text-[var(--text-secondary)]">
                    {activeIngredientLabel(suggestion.item)} · {catalogDetail(suggestion.item, device)}
                  </span>
                  <span className="mt-1 block text-[10px] font-bold text-[var(--blue)]">{supplierName(suggestion.item, suppliers)}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
    </>
  );
}

function ProductPickButton({
  suggestion,
  device,
  onSelect,
}: {
  suggestion: ProductSuggestion;
  device: boolean;
  onSelect: (suggestion: ProductSuggestion) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(suggestion)}
      className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-[var(--background)]"
    >
      <span>
        <span className="block text-xs font-bold text-[var(--navy)]">{suggestion.item.productName}</span>
        <span className="mt-0.5 block text-[10px] text-[var(--text-secondary)]">{productDetail(suggestion.item, device)}</span>
      </span>
      <span className="shrink-0 rounded-full bg-[var(--background)] px-2 py-0.5 text-[10px] font-bold text-[var(--blue)]">
        {sourceLabel(suggestion.source)}
      </span>
    </button>
  );
}

function TypeChoice({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: typeof Pill;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5 text-left transition hover:border-[var(--blue)] hover:bg-white"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[var(--blue)] shadow-sm">
        <Icon className="h-5 w-5" />
      </span>
      <span className="mt-3 block font-display text-sm font-extrabold text-[var(--navy)]">{title}</span>
      <span className="mt-1 block text-xs text-[var(--text-secondary)]">{description}</span>
    </button>
  );
}
