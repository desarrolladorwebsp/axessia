import { NextRequest, NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { getInternalActor } from "@/lib/internal-access";
import { prisma } from "@/lib/prisma";
import { assertInternalSupplierAccess } from "@/lib/supplier-validation";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertInternalSupplierAccess(await getInternalActor());
    const { id } = await params;
    const items = await prisma.quoteItem.findMany({
      where: { supplierId: id },
      orderBy: { createdAt: "desc" },
      select: { productName: true, quantity: true, unitPrice: true, totalPrice: true, quote: { select: { id: true, quoteNumber: true, status: true, createdAt: true, customer: { select: { name: true } }, request: { select: { requestNumber: true } }, payments: { where: { status: PaymentStatus.PAID }, select: { id: true } } } } },
    });
    return NextResponse.json({
      quotes: items.map((item) => ({
        id: item.quote.id,
        quoteNumber: item.quote.quoteNumber,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice?.toString() ?? null,
        totalPrice: item.totalPrice?.toString() ?? null,
        customerName: item.quote.customer.name,
        requestNumber: item.quote.request.requestNumber,
        quoteStatus: item.quote.status,
        saleStatus: item.quote.payments.length ? "VENDIDA" : item.quote.status === "ACCEPTED" ? "ACEPTADA" : "PENDIENTE",
        createdAt: item.quote.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Supplier quotes error:", error);
    return NextResponse.json({ error: "No fue posible cargar las cotizaciones del proveedor." }, { status: 500 });
  }
}
