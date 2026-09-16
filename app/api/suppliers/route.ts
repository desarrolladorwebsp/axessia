import { NextRequest, NextResponse } from "next/server";
import { getInternalActor } from "@/lib/internal-access";
import { assertInternalSupplierAccess, parseSupplierListParams, publicSupplierError } from "@/lib/supplier-validation";
import { createSupplier, listQuoteSuppliers, listSuppliers } from "@/lib/services/suppliers";

function supplierErrorResponse(error: unknown) {
  const mapped = publicSupplierError(error);
  if (mapped.status >= 500) console.error("Supplier error:", error);
  return NextResponse.json({ error: mapped.message }, { status: mapped.status });
}

export async function GET(request: NextRequest) {
  try {
    assertInternalSupplierAccess(await getInternalActor());
    if (request.nextUrl.searchParams.get("forSelect") === "1") {
      return NextResponse.json(await listQuoteSuppliers());
    }
    const result = await listSuppliers(parseSupplierListParams(request.nextUrl.searchParams));
    return NextResponse.json(result);
  } catch (error) {
    return supplierErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertInternalSupplierAccess(await getInternalActor());
    const payload = await request.json();
    const supplier = await createSupplier(payload);
    return NextResponse.json({ message: "Proveedor registrado correctamente.", supplier }, { status: 201 });
  } catch (error) {
    return supplierErrorResponse(error);
  }
}
