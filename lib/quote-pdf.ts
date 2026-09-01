import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type QuotePdfData = {
  quoteNumber: string;
  createdAt: Date;
  validUntil: Date | null;
  total: string | null;
  customer: { name: string; email: string; rut: string; city: string };
  items: Array<{ productName: string; activeIngredient: string | null; concentration: string | null; quantity: number; unitPrice: string | null; totalPrice: string | null }>;
};

const navy = rgb(7 / 255, 30 / 255, 65 / 255);
const blue = rgb(8 / 255, 127 / 255, 213 / 255);
const muted = rgb(79 / 255, 95 / 255, 115 / 255);

export async function generateQuotePdf(quote: QuotePdfData) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const margin = 48;
  let y = height - 58;
  const money = (value: string | null) => value === null ? "Por confirmar" : `$${Number(value).toLocaleString("es-CL")}`;
  const text = (value: string, x: number, size = 10, font = regular, color = navy) => page.drawText(value, { x, y, size, font, color });

  text("AXESSIA", margin, 22, bold, navy);
  text("COTIZACIÓN", width - margin - 105, 16, bold, blue);
  y -= 28;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1.5, color: blue });
  y -= 28;
  text(`N° ${quote.quoteNumber}`, margin, 12, bold);
  text(`Fecha de emisión: ${quote.createdAt.toLocaleDateString("es-CL")}`, margin, 9, regular, muted);
  y -= 36;
  text("CLIENTE", margin, 10, bold, blue);
  y -= 17;
  text(quote.customer.name, margin, 11, bold);
  y -= 15;
  text(`${quote.customer.email} · RUT ${quote.customer.rut} · ${quote.customer.city}`, margin, 9, regular, muted);
  y -= 32;
  page.drawRectangle({ x: margin, y: y - 20, width: width - margin * 2, height: 20, color: rgb(247 / 255, 249 / 255, 252 / 255) });
  page.drawText("Producto", { x: margin + 8, y: y - 13, size: 9, font: bold, color: navy });
  page.drawText("Cant.", { x: 360, y: y - 13, size: 9, font: bold, color: navy });
  page.drawText("Unitario", { x: 415, y: y - 13, size: 9, font: bold, color: navy });
  page.drawText("Total", { x: 510, y: y - 13, size: 9, font: bold, color: navy });
  y -= 38;
  for (const item of quote.items) {
    if (y < 100) break;
    text(item.productName, margin + 8, 10, bold);
    y -= 13;
    text([item.activeIngredient, item.concentration].filter(Boolean).join(" · ") || "Sin especificación", margin + 8, 8, regular, muted);
    text(String(item.quantity), 365, 9);
    text(money(item.unitPrice), 415, 9);
    text(money(item.totalPrice), 510, 9, bold);
    y -= 18;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.4, color: rgb(220 / 255, 228 / 255, 237 / 255) });
    y -= 14;
  }
  y -= 12;
  text(`Total cotización: ${money(quote.total)}`, 365, 13, bold, navy);
  y -= 34;
  text(`Vigencia: ${quote.validUntil ? quote.validUntil.toLocaleDateString("es-CL") : "Sin fecha de vencimiento"}`, margin, 9, regular, muted);
  text("Documento emitido por AXESSIA. Válido para compartir por medios digitales.", margin, 8, regular, muted);
  page.drawLine({ start: { x: margin, y: 44 }, end: { x: width - margin, y: 44 }, thickness: 0.5, color: blue });
  page.drawText(`AXESSIA · ${quote.quoteNumber}`, { x: margin, y: 30, size: 8, font: regular, color: muted });
  return pdf.save();
}