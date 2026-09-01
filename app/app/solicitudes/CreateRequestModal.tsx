"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import Modal from "../components/Modal";
import { PrimaryButton, SecondaryButton } from "../components/Buttons";

type Customer = { id: string; name: string; email: string; phone: string; rut: string; city: string };
type Product = { id: number; commercialName: string; activeIngredient: string; concentration: string; tabletQuantity: string };
type Form = { name: string; email: string; phone: string; rut: string; city: string; patientName: string; patientRut: string; prescription: File | null; acceptsPolicies: boolean; acceptsDataTreatment: boolean };

const emptyForm: Form = { name: "", email: "", phone: "", rut: "", city: "", patientName: "", patientRut: "", prescription: null, acceptsPolicies: false, acceptsDataTreatment: false };
const emptyProduct = (id: number): Product => ({ id, commercialName: "", activeIngredient: "", concentration: "", tabletQuantity: "" });

export default function CreateRequestModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [form, setForm] = useState<Form>(emptyForm);
  const [products, setProducts] = useState<Product[]>([emptyProduct(1)]);
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

  const submit = async () => {
    if (isSubmitting) return;
    const validCustomer = [form.name, form.email, form.phone, form.rut, form.city].every((value) => value.trim());
    const validProducts = products.every((product) => product.commercialName.trim() && product.activeIngredient.trim() && product.concentration.trim() && Number(product.tabletQuantity) > 0);
    if (!validCustomer || !form.prescription || !validProducts || !form.acceptsPolicies || !form.acceptsDataTreatment) {
      setError("Completa los datos del cliente, receta, medicamentos y consentimientos obligatorios.");
      return;
    }
    try {
      setIsSubmitting(true);
      setError("");
      const response = await fetch("/api/quote-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerId || undefined,
          customer: { name: form.name, email: form.email, phone: form.phone, rut: form.rut, city: form.city },
          patient: form.patientName.trim() || form.patientRut.trim() ? { name: form.patientName, rut: form.patientRut } : undefined,
          prescription: { fileName: form.prescription.name, mimeType: form.prescription.type || "application/octet-stream", fileSize: form.prescription.size },
          medications: products.map(({ id: _id, tabletQuantity, ...product }) => ({ ...product, tabletQuantity: Number(tabletQuantity) })),
          acceptsPolicies: form.acceptsPolicies,
          acceptsDataTreatment: form.acceptsDataTreatment,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "No fue posible crear la solicitud.");
      setForm(emptyForm);
      setProducts([emptyProduct(1)]);
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
      <label className="block text-xs font-bold text-[var(--navy)]">Receta médica<input type="file" accept="application/pdf,image/*" onChange={(event) => updateForm("prescription", event.target.files?.[0] ?? null)} className="field-input mt-2" /></label>
      <div className="space-y-3"><div className="flex items-center justify-between"><p className="text-xs font-bold text-[var(--navy)]">Medicamentos</p><button type="button" onClick={() => setProducts((current) => [...current, emptyProduct(Date.now())])} className="icon-button-small" title="Agregar medicamento" aria-label="Agregar medicamento"><Plus className="h-3.5 w-3.5" /></button></div>{products.map((product, index) => <div key={product.id} className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 sm:grid-cols-2 lg:grid-cols-4"><input value={product.commercialName} onChange={(event) => updateProduct(product.id, "commercialName", event.target.value)} placeholder="Nombre comercial" className="field-input" /><input value={product.activeIngredient} onChange={(event) => updateProduct(product.id, "activeIngredient", event.target.value)} placeholder="Principio activo" className="field-input" /><input value={product.concentration} onChange={(event) => updateProduct(product.id, "concentration", event.target.value)} placeholder="Concentración" className="field-input" /><div className="flex gap-2"><input type="number" min="1" value={product.tabletQuantity} onChange={(event) => updateProduct(product.id, "tabletQuantity", event.target.value)} placeholder="Cantidad" className="field-input min-w-0" />{products.length > 1 && <button type="button" onClick={() => setProducts((current) => current.filter((item) => item.id !== product.id))} className="icon-button-small" title={`Eliminar medicamento ${index + 1}`} aria-label={`Eliminar medicamento ${index + 1}`}><Trash2 className="h-3.5 w-3.5" /></button>}</div></div>)}</div>
      <label className="flex items-start gap-2 text-xs text-[var(--text-secondary)]"><input type="checkbox" checked={form.acceptsPolicies} onChange={(event) => updateForm("acceptsPolicies", event.target.checked)} className="mt-0.5 accent-[var(--purple)]" />Acepta las políticas de la empresa.</label>
      <label className="flex items-start gap-2 text-xs text-[var(--text-secondary)]"><input type="checkbox" checked={form.acceptsDataTreatment} onChange={(event) => updateForm("acceptsDataTreatment", event.target.checked)} className="mt-0.5 accent-[var(--purple)]" />Autoriza el tratamiento de datos y contacto.</label>
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}
    </div>
  </Modal>;
}