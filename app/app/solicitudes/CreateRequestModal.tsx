"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import Modal from "../components/Modal";
import { PrimaryButton, SecondaryButton } from "../components/Buttons";
import { buildQuoteRequestFormData } from "@/lib/quote-request-form-data";
import { PRODUCT_TYPE_LABELS, PRODUCT_TYPE_PLURAL_LABELS, isMedicalDevice, type ProductType } from "@/lib/product-type";

type Customer = { id: string; name: string; email: string; phone: string; rut: string; city: string };
type Product = { id: number; commercialName: string; activeIngredient: string; concentration: string; tabletQuantity: string };
type Device = { id: number; name: string; brand: string; model: string; quantity: string; description: string };
type Form = { name: string; email: string; phone: string; rut: string; city: string; patientName: string; patientRut: string; prescription: File | null; acceptsPolicies: boolean; acceptsDataTreatment: boolean };

const emptyForm: Form = { name: "", email: "", phone: "", rut: "", city: "", patientName: "", patientRut: "", prescription: null, acceptsPolicies: false, acceptsDataTreatment: false };
const emptyProduct = (id: number): Product => ({ id, commercialName: "", activeIngredient: "", concentration: "", tabletQuantity: "" });
const emptyDevice = (id: number): Device => ({ id, name: "", brand: "", model: "", quantity: "", description: "" });

export default function CreateRequestModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [form, setForm] = useState<Form>(emptyForm);
  const [productType, setProductType] = useState<ProductType>("MEDICATION");
  const [products, setProducts] = useState<Product[]>([emptyProduct(1)]);
  const [devices, setDevices] = useState<Device[]>([emptyDevice(1)]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const loadCustomers = async () => {
      const response = await fetch("/api/customers?limit=50");
      if (!response.ok) throw new Error("No fue posible cargar los clientes.");
      const result = await response.json() as { customers: Customer[] };
      setCustomers(result.customers);
    };
    void loadCustomers().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "No fue posible cargar los clientes."));
  }, [open]);

  const selectCustomer = (id: string) => {
    setCustomerId(id);
    setError("");
    const customer = customers.find((item) => item.id === id);
    if (customer) setForm((current) => ({ ...current, name: customer.name, email: customer.email, phone: customer.phone, rut: customer.rut, city: customer.city }));
    if (!id) setForm((current) => ({ ...current, name: "", email: "", phone: "", rut: "", city: "" }));
  };

  const updateForm = (field: keyof Form, value: string | boolean | File | null) => setForm((current) => ({ ...current, [field]: value }));
  const updateProduct = (id: number, field: keyof Omit<Product, "id">, value: string) => setProducts((current) => current.map((product) => product.id === id ? { ...product, [field]: value } : product));
  const updateDevice = (id: number, field: keyof Omit<Device, "id">, value: string) => setDevices((current) => current.map((device) => device.id === id ? { ...device, [field]: value } : device));

  const submit = async () => {
    if (isSubmitting) return;
    const deviceRequest = isMedicalDevice(productType);
    const validCustomer = [form.name, form.email, form.phone, form.rut, form.city].every((value) => value.trim());
    const validProducts = deviceRequest
      ? devices.every((device) => device.name.trim())
      : products.every((product) => product.commercialName.trim() && product.activeIngredient.trim() && product.concentration.trim() && Number(product.tabletQuantity) > 0);
    const missing: string[] = [];
    if (!validCustomer) missing.push("datos del cliente");
    if (!deviceRequest && !form.prescription) missing.push("receta médica (adjunta un archivo)");
    if (!validProducts) missing.push(deviceRequest ? "dispositivos médicos" : "medicamentos");
    if (!form.acceptsPolicies || !form.acceptsDataTreatment) missing.push("consentimientos obligatorios");
    if (missing.length > 0) {
      setError(`Falta completar: ${missing.join(", ")}.`);
      return;
    }
    if (!deviceRequest && !form.prescription) return;
    try {
      setIsSubmitting(true);
      setError("");
      const response = await fetch("/api/quote-requests", {
        method: "POST",
        body: buildQuoteRequestFormData({
          customerId: customerId || undefined,
          productType,
          customer: { name: form.name, email: form.email, phone: form.phone, rut: form.rut, city: form.city },
          patient: form.patientName.trim() || form.patientRut.trim() ? { name: form.patientName, rut: form.patientRut } : undefined,
          medications: deviceRequest ? [] : products.map(({ id: _id, tabletQuantity, ...product }) => ({ ...product, tabletQuantity: Number(tabletQuantity) })),
          medicalDevices: deviceRequest ? devices.map(({ id: _id, quantity, ...device }) => ({ ...device, quantity: quantity.trim() ? Number(quantity) : null })) : [],
          acceptsPolicies: form.acceptsPolicies,
          acceptsDataTreatment: form.acceptsDataTreatment,
        }, form.prescription),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "No fue posible crear la solicitud.");
      setForm(emptyForm);
      setProductType("MEDICATION");
      setProducts([emptyProduct(1)]);
      setDevices([emptyDevice(1)]);
      setCustomerId("");
      onCreated();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No fue posible crear la solicitud.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return <Modal open={open} onClose={() => !isSubmitting && onClose()} dismissible={false} title="Nueva solicitud" description="Registra una solicitud en nombre de un cliente." maxWidthClassName="max-w-4xl" footer={<div className="flex justify-end gap-2"><SecondaryButton size="sm" onClick={onClose} disabled={isSubmitting}>Cancelar</SecondaryButton><PrimaryButton size="sm" onClick={() => void submit()} disabled={isSubmitting} icon={isSubmitting ? Loader2 : undefined} className={isSubmitting ? "[&_svg]:animate-spin" : ""}>{isSubmitting ? "Creando..." : "Crear solicitud"}</PrimaryButton></div>}>
    <div className="space-y-5">
      <label className="block text-xs font-bold text-[var(--navy)]">Cliente existente
        <select value={customerId} onChange={(event) => selectCustomer(event.target.value)} className="field-input mt-2"><option value="">Ingresar nuevo cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.email}</option>)}</select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(["name", "email", "phone", "rut", "city"] as const).map((field) => <label key={field} className="text-xs font-bold capitalize text-[var(--navy)]">{{ name: "Nombre", email: "Correo", phone: "Teléfono", rut: "RUT", city: "Ciudad" }[field]}<input value={form[field]} type={field === "email" ? "email" : "text"} onChange={(event) => updateForm(field, event.target.value)} disabled={Boolean(customerId)} className="field-input mt-2 disabled:cursor-not-allowed disabled:opacity-60" /></label>)}</div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-[var(--navy)]">Nombre del paciente (opcional)<input value={form.patientName} onChange={(event) => updateForm("patientName", event.target.value)} className="field-input mt-2" /></label><label className="text-xs font-bold text-[var(--navy)]">RUT del paciente (opcional)<input value={form.patientRut} onChange={(event) => updateForm("patientRut", event.target.value)} className="field-input mt-2" /></label></div>
      <div>
        <p className="text-xs font-bold text-[var(--navy)]">¿Qué necesita el cliente?</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {(["MEDICATION", "MEDICAL_DEVICE"] as const).map((type) => (
            <button key={type} type="button" onClick={() => setProductType(type)} className={`rounded-xl border px-3 py-3 text-left transition ${productType === type ? "border-[var(--blue)] bg-[rgba(8,127,213,0.06)]" : "border-[var(--border)] bg-[var(--background)]"}`}>
              <p className="text-xs font-extrabold text-[var(--navy)]">{PRODUCT_TYPE_LABELS[type]}</p>
              <p className="mt-1 text-[10px] text-[var(--text-secondary)]">{type === "MEDICATION" ? "Campos actuales de medicamento" : "Información básica del dispositivo"}</p>
            </button>
          ))}
        </div>
      </div>
      <label className="block text-xs font-bold text-[var(--navy)]">{isMedicalDevice(productType) ? "Documento de respaldo (opcional)" : "Receta médica"}<input type="file" accept="application/pdf,image/*" onChange={(event) => updateForm("prescription", event.target.files?.[0] ?? null)} className="field-input mt-2" /></label>
      {isMedicalDevice(productType) ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[var(--navy)]">{PRODUCT_TYPE_PLURAL_LABELS.MEDICAL_DEVICE}</p>
            <button type="button" onClick={() => setDevices((current) => [...current, emptyDevice(Date.now())])} className="icon-button-small" title="Agregar dispositivo" aria-label="Agregar dispositivo"><Plus className="h-3.5 w-3.5" /></button>
          </div>
          {devices.map((device, index) => (
            <div key={device.id} className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 sm:grid-cols-2">
              <input value={device.name} onChange={(event) => updateDevice(device.id, "name", event.target.value)} placeholder="Nombre del dispositivo" className="field-input" />
              <input value={device.brand} onChange={(event) => updateDevice(device.id, "brand", event.target.value)} placeholder="Marca (opcional)" className="field-input" />
              <input value={device.model} onChange={(event) => updateDevice(device.id, "model", event.target.value)} placeholder="Modelo o referencia (opcional)" className="field-input" />
              <div className="flex gap-2">
                <input type="number" min="1" value={device.quantity} onChange={(event) => updateDevice(device.id, "quantity", event.target.value)} placeholder="Cantidad (opcional)" className="field-input min-w-0" />
                {devices.length > 1 && <button type="button" onClick={() => setDevices((current) => current.filter((item) => item.id !== device.id))} className="icon-button-small" title={`Eliminar dispositivo ${index + 1}`} aria-label={`Eliminar dispositivo ${index + 1}`}><Trash2 className="h-3.5 w-3.5" /></button>}
              </div>
              <textarea value={device.description} onChange={(event) => updateDevice(device.id, "description", event.target.value)} placeholder="Descripción o características necesarias (opcional)" rows={2} className="field-input sm:col-span-2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[var(--navy)]">{PRODUCT_TYPE_PLURAL_LABELS.MEDICATION}</p>
            <button type="button" onClick={() => setProducts((current) => [...current, emptyProduct(Date.now())])} className="icon-button-small" title="Agregar medicamento" aria-label="Agregar medicamento"><Plus className="h-3.5 w-3.5" /></button>
          </div>
          {products.map((product, index) => (
            <div key={product.id} className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 sm:grid-cols-2 lg:grid-cols-4">
              <input value={product.commercialName} onChange={(event) => updateProduct(product.id, "commercialName", event.target.value)} placeholder="Nombre comercial" className="field-input" />
              <input value={product.activeIngredient} onChange={(event) => updateProduct(product.id, "activeIngredient", event.target.value)} placeholder="Principio activo" className="field-input" />
              <input value={product.concentration} onChange={(event) => updateProduct(product.id, "concentration", event.target.value)} placeholder="Concentración" className="field-input" />
              <div className="flex gap-2">
                <input type="number" min="1" value={product.tabletQuantity} onChange={(event) => updateProduct(product.id, "tabletQuantity", event.target.value)} placeholder="Cantidad" className="field-input min-w-0" />
                {products.length > 1 && <button type="button" onClick={() => setProducts((current) => current.filter((item) => item.id !== product.id))} className="icon-button-small" title={`Eliminar medicamento ${index + 1}`} aria-label={`Eliminar medicamento ${index + 1}`}><Trash2 className="h-3.5 w-3.5" /></button>}
              </div>
            </div>
          ))}
        </div>
      )}
      <label className="flex items-start gap-2 text-xs text-[var(--text-secondary)]"><input type="checkbox" checked={form.acceptsPolicies} onChange={(event) => updateForm("acceptsPolicies", event.target.checked)} className="mt-0.5 accent-[var(--purple)]" />Acepta las políticas de la empresa.</label>
      <label className="flex items-start gap-2 text-xs text-[var(--text-secondary)]"><input type="checkbox" checked={form.acceptsDataTreatment} onChange={(event) => updateForm("acceptsDataTreatment", event.target.checked)} className="mt-0.5 accent-[var(--purple)]" />Autoriza el tratamiento de datos y contacto.</label>
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}
    </div>
  </Modal>;
}
