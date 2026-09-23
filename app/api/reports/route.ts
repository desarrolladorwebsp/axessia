import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { PaymentStatus, QuoteRequestStatus, QuoteStatus } from "@prisma/client";
import { getInternalActor } from "@/lib/internal-access";
import { prisma } from "@/lib/prisma";

type ReportType = "requests" | "customers" | "suppliers" | "quotes" | "sales" | "executives";
type ReportRow = Record<string, string | number>;

const labels: Record<ReportType, string> = {
  requests: "Solicitudes",
  customers: "Clientes",
  suppliers: "Proveedores",
  quotes: "Cotizaciones",
  sales: "Ventas",
  executives: "Por ejecutivo",
};

function parseDate(value: string | null, end = false) {
  if (!value) return undefined;
  const date = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function escapeCsv(value: string | number) {
  const text = String(value).replace(/"/g, '""');
  return /[",\n]/.test(text) ? `"${text}"` : text;
}

function serialize(rows: ReportRow[]) {
  return rows.map((row) => Object.values(row).map(escapeCsv).join(",")).join("\n");
}

function asDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

async function getRows(type: ReportType, from?: Date, to?: Date, status?: string, executiveId?: string): Promise<ReportRow[]> {
  if (type === "executives") {
    const where = { ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}), ...(executiveId === "unassigned" ? { assignedExecutiveId: null } : executiveId ? { assignedExecutiveId: executiveId } : {}) };
    const records = await prisma.quoteRequest.findMany({ where, take: 5000, select: { status: true, assignedExecutive: { select: { id: true, firstName: true, lastName: true } }, quotes: { select: { status: true, payments: { where: { status: PaymentStatus.PAID }, select: { amount: true } } } } } });
    const grouped = new Map<string, { name: string; assigned: number; quoted: number; accepted: number; paid: number; completed: number; total: number }>();
    for (const record of records) {
      const id = record.assignedExecutive?.id ?? "unassigned";
      const current = grouped.get(id) ?? { name: record.assignedExecutive ? `${record.assignedExecutive.firstName} ${record.assignedExecutive.lastName}` : "Sin asignar", assigned: 0, quoted: 0, accepted: 0, paid: 0, completed: 0, total: 0 };
      current.assigned += 1;
      if (record.quotes.some((quote) => ["SENT", "ACCEPTED"].includes(quote.status))) current.quoted += 1;
      if (record.quotes.some((quote) => quote.status === "ACCEPTED")) current.accepted += 1;
      if (record.quotes.some((quote) => quote.payments.length > 0)) { current.paid += 1; current.total += record.quotes.reduce((sum, quote) => sum + quote.payments.reduce((amount, payment) => amount + Number(payment.amount), 0), 0); }
      if (record.status === "COMPLETED") current.completed += 1;
      grouped.set(id, current);
    }
    return [...grouped.values()].sort((a, b) => b.total - a.total).map((item) => ({ Ejecutivo: item.name, "Solicitudes asignadas": item.assigned, Cotizadas: item.quoted, "Cotizaciones aceptadas": item.accepted, "Cotizaciones pagadas": item.paid, Completadas: item.completed, "Total vendido": item.total.toFixed(2) }));
  }
  if (type === "sales") {
    const paidAt = from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } : undefined;
    const records = await prisma.quote.findMany({
      where: { status: QuoteStatus.ACCEPTED, payments: { some: { status: PaymentStatus.PAID, ...(paidAt ? { paidAt } : {}) } } },
      orderBy: { createdAt: "desc" }, take: 5000,
      select: { quoteNumber: true, customer: { select: { name: true, email: true } }, request: { select: { requestNumber: true } }, items: { select: { productName: true, quantity: true, unitPrice: true, totalPrice: true } }, payments: { where: { status: PaymentStatus.PAID }, orderBy: { paidAt: "desc" }, take: 1, select: { paidAt: true, amount: true } } },
    });
    return records.flatMap((quote) => quote.items.map((item) => ({ Cotización: quote.quoteNumber ?? "", Solicitud: quote.request.requestNumber ?? "", Cliente: quote.customer.name, Correo: quote.customer.email, Producto: item.productName, Cantidad: item.quantity, Precio: item.unitPrice?.toString() ?? "", Total: item.totalPrice?.toString() ?? "", Costo: "No registrado", "Fecha de pago": quote.payments[0]?.paidAt ? asDate(quote.payments[0].paidAt) : "" })));
  }
  const createdAt = from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } : undefined;
  if (type === "requests") {
    const where = { ...(createdAt ? { createdAt } : {}), ...(status && Object.values(QuoteRequestStatus).includes(status as QuoteRequestStatus) ? { status: status as QuoteRequestStatus } : {}) };
    const records = await prisma.quoteRequest.findMany({ where, orderBy: { createdAt: "desc" }, take: 5000, select: { requestNumber: true, requesterName: true, requesterEmail: true, requesterRut: true, requesterCity: true, status: true, origin: true, productType: true, createdAt: true } });
    return records.map((item) => ({ Numero: item.requestNumber ?? "", Cliente: item.requesterName, Correo: item.requesterEmail, RUT: item.requesterRut, Ciudad: item.requesterCity, Estado: item.status, Origen: item.origin, Tipo: item.productType, Fecha: asDate(item.createdAt) }));
  }
  if (type === "customers") {
    const records = await prisma.customer.findMany({ where: createdAt ? { createdAt } : undefined, orderBy: { createdAt: "desc" }, take: 5000, select: { name: true, email: true, phone: true, rut: true, city: true, createdAt: true } });
    return records.map((item) => ({ Nombre: item.name, Correo: item.email, Teléfono: item.phone, RUT: item.rut, Ciudad: item.city, Fecha: asDate(item.createdAt) }));
  }
  if (type === "suppliers") {
    const records = await prisma.supplier.findMany({ where: createdAt ? { createdAt } : undefined, orderBy: { createdAt: "desc" }, take: 5000, select: { name: true, identifier: true, contactName: true, email: true, phone: true, country: true, createdAt: true } });
    return records.map((item) => ({ Nombre: item.name, Identificador: item.identifier ?? "", Contacto: item.contactName ?? "", Correo: item.email ?? "", Teléfono: item.phone ?? "", País: item.country ?? "", Fecha: asDate(item.createdAt) }));
  }
  const where = { ...(createdAt ? { createdAt } : {}), ...(status && Object.values(QuoteStatus).includes(status as QuoteStatus) ? { status: status as QuoteStatus } : {}) };
  const records = await prisma.quote.findMany({ where, orderBy: { createdAt: "desc" }, take: 5000, select: { quoteNumber: true, status: true, total: true, validUntil: true, createdAt: true, customer: { select: { name: true, email: true } }, request: { select: { requestNumber: true } } } });
  return records.map((item) => ({ Numero: item.quoteNumber ?? "", Solicitud: item.request.requestNumber ?? "", Cliente: item.customer.name, Correo: item.customer.email, Estado: item.status, Total: item.total?.toString() ?? "", Vigencia: item.validUntil ? asDate(item.validUntil) : "", Fecha: asDate(item.createdAt) }));
}

async function makePdf(title: string, rows: ReportRow[]) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const headers = Object.keys(rows[0] ?? {});
  let page = pdf.addPage([842, 595]);
  let y = 560;
  const draw = (text: string, x: number, size = 8) => page.drawText(text.slice(0, 28), { x, y, size, font, color: rgb(0.08, 0.14, 0.25) });
  page.drawText(title, { x: 30, y, size: 16, font, color: rgb(0.08, 0.14, 0.25) }); y -= 28;
  const drawRow = (values: string[]) => { const width = 780 / Math.max(headers.length, 1); values.forEach((value, index) => page.drawText(String(value).slice(0, 22), { x: 30 + index * width, y, size: 7, font, color: rgb(0.1, 0.1, 0.1) })); y -= 15; };
  drawRow(headers);
  for (const row of rows) { if (y < 25) { page = pdf.addPage([842, 595]); y = 560; drawRow(headers); } drawRow(Object.values(row).map(String)); }
  return pdf.save();
}

export async function GET(request: NextRequest) {
  if (!await getInternalActor()) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const params = request.nextUrl.searchParams;
  const type = (params.get("type") || "requests") as ReportType;
  if (!Object.keys(labels).includes(type)) return NextResponse.json({ error: "Tipo de reporte no válido." }, { status: 400 });
  try {
    const rows = await getRows(type, parseDate(params.get("from")), parseDate(params.get("to"), true), params.get("status") || undefined, params.get("executiveId") || undefined);
    const format = params.get("format");
    if (!format) return NextResponse.json({ title: labels[type], rows, count: rows.length });
    const filename = `axessia-${type}-${new Date().toISOString().slice(0, 10)}`;
    if (format === "csv") return new NextResponse(`\ufeff${serialize(rows)}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}.csv"` } });
    if (format === "xlsx") {
      const headers = Object.keys(rows[0] ?? {});
      const html = `<table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${Object.values(row).map((value) => `<td>${String(value).replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char] ?? char))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      return new NextResponse(html, { headers: { "Content-Type": "application/vnd.ms-excel; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}.xls"` } });
    }
    if (format === "pdf") {
      const pdfBytes = await makePdf(labels[type], rows);
      const pdfBody = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
      return new NextResponse(pdfBody, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}.pdf"` } });
    }
    return NextResponse.json({ error: "Formato no válido." }, { status: 400 });
  } catch (error) { console.error("Report error:", error); return NextResponse.json({ error: "No fue posible generar el reporte." }, { status: 500 }); }
}
