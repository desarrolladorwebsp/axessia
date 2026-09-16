"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Eye, Hash, Mail, Pencil, Phone, Plus, Trash2, UserRound } from "lucide-react";
import PageHeader from "../components/PageHeader";
import MetricCard from "../components/MetricCard";
import { PrimaryButton } from "../components/Buttons";
import Avatar from "../components/Avatar";
import { FilterBar, SearchField } from "../components/FilterBar";
import Pagination from "../components/Pagination";
import { SkeletonTable } from "../components/Skeletons";
import { EmptyState, ErrorState } from "../components/States";
import SupplierFormModal, { emptySupplierForm, type SupplierFormValues } from "./SupplierFormModal";
import SupplierDetailModal from "./SupplierDetailModal";
import DeleteSupplierModal from "./DeleteSupplierModal";
import type { SupplierRecord, SuppliersResponse } from "./types";

function toFormValues(supplier: SupplierRecord): SupplierFormValues {
  return {
    name: supplier.name,
    identifier: supplier.identifier ?? "",
    phone: supplier.phone ?? "",
    contactName: supplier.contactName ?? "",
    email: supplier.email ?? "",
    manufacturer: supplier.manufacturer ?? "",
    originCountry: supplier.originCountry ?? "",
    country: supplier.country ?? "",
    notes: supplier.notes ?? "",
  };
}

export default function SuppliersPage() {
  const [data, setData] = useState<SuppliersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selected, setSelected] = useState<SupplierRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setIsLoading(true);
        setError("");
        const params = new URLSearchParams({ page: String(page), limit: "10" });
        if (query.trim()) params.set("q", query.trim());
        const response = await fetch(`/api/suppliers?${params.toString()}`);
        if (!response.ok) {
          const result = (await response.json()) as { error?: string };
          throw new Error(result.error || "No fue posible cargar los proveedores.");
        }
        setData((await response.json()) as SuppliersResponse);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "No fue posible cargar los proveedores.");
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchSuppliers();
  }, [page, query, refreshKey]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const refresh = (message: string) => {
    setNotice(message);
    setRefreshKey((current) => current + 1);
  };

  const openCreate = () => {
    setSelected(null);
    setFormMode("create");
    setFormOpen(true);
  };

  const openEdit = (supplier: SupplierRecord) => {
    setSelected(supplier);
    setFormMode("edit");
    setDetailOpen(false);
    setFormOpen(true);
  };

  const openDetail = (supplier: SupplierRecord) => {
    setSelected(supplier);
    setDetailOpen(true);
  };

  const openDelete = (supplier: SupplierRecord) => {
    setSelected(supplier);
    setDeleteError("");
    setDetailOpen(false);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selected || isDeleting) return;
    try {
      setIsDeleting(true);
      setDeleteError("");
      const response = await fetch(`/api/suppliers/${selected.id}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "No fue posible eliminar el proveedor.");
      setDeleteOpen(false);
      setSelected(null);
      refresh(result.message || "Proveedor eliminado correctamente.");
    } catch (deleteErr) {
      setDeleteError(deleteErr instanceof Error ? deleteErr.message : "No fue posible eliminar el proveedor.");
    } finally {
      setIsDeleting(false);
    }
  };

  const summary = data?.summary ?? { total: 0, withEmail: 0, withPhone: 0, withIdentifier: 0 };
  const suppliers = data?.suppliers ?? [];

  return (
    <div className="mx-auto w-full max-w-[1480px] px-1 py-2 sm:px-2 lg:px-4">
      <PageHeader
        icon={Building2}
        eyebrow="Gestión operativa"
        title="Proveedores"
        description="Administración de proveedores extranjeros y de operación de AXESSIA"
        actions={<PrimaryButton onClick={openCreate} icon={Plus} size="sm">Nuevo proveedor</PrimaryButton>}
      />

      {notice && (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800" role="status">
          {notice}
        </p>
      )}

      {error && <ErrorState title="Error al cargar proveedores" description={error} onRetry={() => setRefreshKey((current) => current + 1)} />}
      {isLoading && <SkeletonTable rows={8} />}

      {!isLoading && data && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total de proveedores" value={String(summary.total)} detail="Registros activos" trend="●" icon={Building2} tone="violet" />
            <MetricCard label="Con número / ID" value={String(summary.withIdentifier)} detail="Identificador comercial" trend="●" icon={Hash} tone="blue" />
            <MetricCard label="Con teléfono" value={String(summary.withPhone)} detail="Contacto telefónico" trend="●" icon={Phone} tone="green" />
            <MetricCard label="Con correo" value={String(summary.withEmail)} detail="Contacto por email" trend="●" icon={Mail} tone="yellow" />
          </section>

          <FilterBar>
            <SearchField
              value={query}
              onChange={(value) => {
                setPage(1);
                setQuery(value);
              }}
              placeholder="Buscar por nombre, número/ID, responsable o correo"
              label="Buscar proveedores"
            />
          </FilterBar>

          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[0_10px_30px_rgba(7,30,65,0.05)]">
            <div className="border-b border-[var(--border)] p-5">
              <h2 className="font-display text-lg font-extrabold text-[var(--navy)]">Directorio de proveedores</h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Consulta y administración de proveedores registrados</p>
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1080px] text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                    {["Nombre", "Número / ID", "Persona responsable", "Laboratorio / fabricante", "País del proveedor", "Teléfono", "Correo"].map((header) => (
                      <th key={header} className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--navy)]">{header}</th>
                    ))}
                    <th className="w-28 px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[var(--navy)]">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier, index) => (
                    <motion.tr key={supplier.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.04 }} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]">
                      <td className="px-3 py-4">
                        <button type="button" onClick={() => openDetail(supplier)} className="flex items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]">
                          <Avatar name={supplier.name} />
                          <p className="max-w-[180px] truncate text-xs font-bold text-[var(--navy)]">{supplier.name}</p>
                        </button>
                      </td>
                      <td className="px-3 py-4 text-xs font-bold text-[var(--blue)]">{supplier.identifier || "—"}</td>
                      <td className="px-3 py-4 text-xs text-[var(--text-secondary)]">{supplier.contactName || "—"}</td>
                      <td className="px-3 py-4 text-xs text-[var(--text-secondary)]">{supplier.manufacturer || "—"}</td>
                      <td className="px-3 py-4 text-xs text-[var(--text-secondary)]">{supplier.country || "—"}</td>
                      <td className="px-3 py-4 text-xs text-[var(--text-secondary)]">{supplier.phone || "—"}</td>
                      <td className="px-3 py-4 text-xs text-[var(--text-secondary)]">{supplier.email || "—"}</td>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-1">
                          <button type="button" className="icon-button-small" onClick={() => openDetail(supplier)} aria-label={`Ver ${supplier.name}`} title="Ver">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" className="icon-button-small" onClick={() => openEdit(supplier)} aria-label={`Editar ${supplier.name}`} title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" className="icon-button-small" onClick={() => openDelete(supplier)} aria-label={`Eliminar ${supplier.name}`} title="Eliminar">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-[var(--border)] md:hidden">
              {suppliers.map((supplier) => (
                <article key={supplier.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <button type="button" onClick={() => openDetail(supplier)} className="flex min-w-0 items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]">
                      <Avatar name={supplier.name} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[var(--navy)]">{supplier.name}</p>
                        <p className="truncate text-[10px] font-bold text-[var(--blue)]">{supplier.identifier || "Sin número / ID"}</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1">
                      <button type="button" className="icon-button-small" onClick={() => openDetail(supplier)} aria-label={`Ver ${supplier.name}`} title="Ver">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" className="icon-button-small" onClick={() => openEdit(supplier)} aria-label={`Editar ${supplier.name}`} title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" className="icon-button-small" onClick={() => openDelete(supplier)} aria-label={`Eliminar ${supplier.name}`} title="Eliminar">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-[10px] text-[var(--text-secondary)]">
                    <p>{supplier.contactName || "Sin persona responsable"}</p>
                    <p>{supplier.manufacturer || "Sin laboratorio / fabricante"} · {supplier.country || "Sin país del proveedor"}</p>
                    <p>{supplier.phone || "Sin teléfono"} · {supplier.email || "Sin correo"}</p>
                  </div>
                </article>
              ))}
            </div>

            {suppliers.length === 0 && (
              <EmptyState
                title="No hay proveedores"
                description={query.trim() ? "No encontramos proveedores con esa búsqueda." : "Todavía no hay proveedores registrados."}
                icon={UserRound}
                action={query.trim() ? undefined : { label: "Nuevo proveedor", onClick: openCreate }}
              />
            )}

            <Pagination
              shown={suppliers.length}
              total={data.pagination.total}
              itemLabel="proveedores"
              page={data.pagination.page}
              pages={data.pagination.pages}
              pageSize={data.pagination.limit}
              onPageChange={setPage}
            />
          </section>
        </motion.div>
      )}

      <SupplierFormModal
        key={formOpen ? `${formMode}-${selected?.id ?? "new"}` : "closed"}
        open={formOpen}
        mode={formMode}
        supplierId={selected?.id}
        initialValues={formMode === "edit" && selected ? toFormValues(selected) : emptySupplierForm}
        onClose={() => setFormOpen(false)}
        onSaved={(message) => {
          setPage(1);
          refresh(message);
        }}
      />
      <SupplierDetailModal
        open={detailOpen}
        supplier={selected}
        onClose={() => setDetailOpen(false)}
        onEdit={() => selected && openEdit(selected)}
        onDelete={() => selected && openDelete(selected)}
      />
      <DeleteSupplierModal
        open={deleteOpen}
        supplierName={selected?.name ?? "este proveedor"}
        isSubmitting={isDeleting}
        error={deleteError}
        onClose={() => !isDeleting && setDeleteOpen(false)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
