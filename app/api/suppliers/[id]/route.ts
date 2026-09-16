import { NextRequest, NextResponse } from "next/server";
import { getInternalActor } from "@/lib/internal-access";
import { assertInternalSupplierAccess, publicSupplierError } from "@/lib/supplier-validation";
import { deleteSupplier, getSupplier, updateSupplier } from "@/lib/services/suppliers";

type RouteContext = { params: Promise<{ id: string }> };

function supplierErrorResponse(error: unknown) {
  const mapped = publicSupplierError(error);
  if (mapped.status >= 500) console.error("Supplier error:", error);
  return NextResponse.json({ error: mapped.message }, { status: mapped.status });
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    assertInternalSupplierAccess(await getInternalActor());
    const { id } = await params;
    const supplier = await getSupplier(id);
    return NextResponse.json({ supplier });
  } catch (error) {
    return supplierErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    assertInternalSupplierAccess(await getInternalActor());
    const { id } = await params;
    const payload = await request.json();
    const supplier = await updateSupplier(id, payload);
    return NextResponse.json({ message: "Proveedor actualizado correctamente.", supplier });
  } catch (error) {
    return supplierErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    assertInternalSupplierAccess(await getInternalActor());
    const { id } = await params;
    await deleteSupplier(id);
    return NextResponse.json({ message: "Proveedor eliminado correctamente." });
  } catch (error) {
    return supplierErrorResponse(error);
  }
}
