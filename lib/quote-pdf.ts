import { promises as fs } from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { getAxessiaLegalDetails } from "@/lib/axessia-legal";

export type QuotePdfItem = {
  productName: string;
  activeIngredient: string | null;
  concentration: string | null;
  pharmaceuticalForm?: string | null;
  presentation?: string | null;
  unitsPerPackage?: number | null;
  manufacturer?: string | null;
  originCountry?: string | null;
  supplierCountry?: string | null;
  quantity: number;
  sanitaryRegistry?: string | null;
  condition?: "AVAILABLE" | "SPECIAL_IMPORT" | null;
  batchNumber?: string | null;
  expirationDate?: Date | null;
  unitPrice: string | null;
  totalPrice: string | null;
};

export type QuotePdfData = {
  quoteNumber: string;
  version?: number;
  status?: string;
  createdAt: Date;
  validUntil: Date | null;
  total: string | null;
  requestNumber?: string | null;
  customer: {
    name: string;
    email: string;
    rut: string;
    city: string;
    phone?: string | null;
  };
  items: QuotePdfItem[];
};

const navy = rgb(7 / 255, 30 / 255, 65 / 255);
const navyDark = rgb(4 / 255, 21 / 255, 47 / 255);
const blue = rgb(8 / 255, 127 / 255, 213 / 255);
const cyan = rgb(0 / 255, 166 / 255, 217 / 255);
const purple = rgb(122 / 255, 40 / 255, 216 / 255);
const muted = rgb(79 / 255, 95 / 255, 115 / 255);
const border = rgb(220 / 255, 228 / 255, 237 / 255);
const canvas = rgb(247 / 255, 249 / 255, 252 / 255);
const white = rgb(1, 1, 1);

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 42;
const headerHeight = 72;
const footerHeight = 54;
const contentWidth = pageWidth - margin * 2;
const contentTop = pageHeight - headerHeight - 18;
const contentBottom = footerHeight + 14;

const quoteStatusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  READY: "Lista para enviar",
  SENT: "Enviada",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  EXPIRED: "Vencida",
  VOIDED: "Anulada",
};

const conditionLabels: Record<string, string> = {
  AVAILABLE: "Medicamento disponible",
  SPECIAL_IMPORT: "Importación especial",
};

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const words = normalized.split(" ");
  const lines: string[] = [];
  let line = "";

  const pushLongWord = (word: string) => {
    let chunk = "";
    for (const char of word) {
      const next = chunk + char;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) chunk = next;
      else {
        if (chunk) lines.push(chunk);
        chunk = char;
      }
    }
    line = chunk;
  };

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    if (font.widthOfTextAtSize(word, size) <= maxWidth) line = word;
    else pushLongWord(word);
  }
  if (line) lines.push(line);
  return lines;
}

function money(value: string | null) {
  if (value === null) return "Por confirmar";
  return `$${Number(value).toLocaleString("es-CL")}`;
}

function formatDate(value: Date | null) {
  if (!value) return "Sin fecha de vencimiento";
  return value.toLocaleDateString("es-CL");
}

function joinParts(parts: Array<string | null | undefined>) {
  return parts.map((part) => part?.trim()).filter((part): part is string => Boolean(part)).join(" · ");
}

function itemDetailLines(item: QuotePdfItem) {
  return [
    joinParts([item.activeIngredient, item.concentration]) || "Sin especificación",
    joinParts([
      item.pharmaceuticalForm,
      item.presentation,
      item.unitsPerPackage ? `${item.unitsPerPackage} un. por presentación` : null,
    ]),
    joinParts([
      item.manufacturer ? `Lab. ${item.manufacturer}` : null,
      item.originCountry ? `Origen: ${item.originCountry}` : null,
      item.supplierCountry ? `Proveedor: ${item.supplierCountry}` : null,
    ]),
    joinParts([
      item.sanitaryRegistry ? `Reg. sanitario: ${item.sanitaryRegistry}` : null,
      item.condition ? conditionLabels[item.condition] : null,
      item.batchNumber ? `Lote: ${item.batchNumber}` : null,
      item.expirationDate ? `Venc. producto: ${formatDate(item.expirationDate)}` : null,
    ]),
  ].filter(Boolean);
}

async function embedBrandLogo(pdf: PDFDocument): Promise<PDFImage | null> {
  try {
    const bytes = await fs.readFile(path.join(process.cwd(), "public", "images", "logo-axessia-white.png"));
    return await pdf.embedPng(bytes);
  } catch {
    try {
      const bytes = await fs.readFile(path.join(process.cwd(), "public", "images", "logo-axessia.png"));
      return await pdf.embedPng(bytes);
    } catch {
      return null;
    }
  }
}

export async function generateQuotePdf(quote: QuotePdfData) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedBrandLogo(pdf);
  const company = getAxessiaLegalDetails();
  const pages: PDFPage[] = [];

  const colTotalRight = pageWidth - margin - 8;
  const colUnitRight = colTotalRight - 78;
  const colQtyRight = colUnitRight - 72;
  const productX = margin + 8;
  const productWidth = colQtyRight - productX - 16;

  let page!: PDFPage;
  let y = contentTop;

  const addPage = () => {
    page = pdf.addPage([pageWidth, pageHeight]);
    pages.push(page);
    y = contentTop;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < contentBottom) addPage();
  };

  const drawRight = (text: string, right: number, baseline: number, size: number, font: PDFFont, color = navy) => {
    page.drawText(text, { x: right - font.widthOfTextAtSize(text, size), y: baseline, size, font, color });
  };

  const drawTableHeader = () => {
    const height = 22;
    ensureSpace(height + 8);
    page.drawRectangle({ x: margin, y: y - height, width: contentWidth, height, color: navy });
    const baseline = y - 15;
    page.drawText("Producto / detalle", { x: productX, y: baseline, size: 8, font: bold, color: white });
    drawRight("Cant.", colQtyRight, baseline, 8, bold, white);
    drawRight("Unitario", colUnitRight, baseline, 8, bold, white);
    drawRight("Total", colTotalRight, baseline, 8, bold, white);
    y -= height + 6;
  };

  addPage();

  const customerLines = [
    ["Nombre", quote.customer.name],
    ["RUT", quote.customer.rut],
    ["Correo", quote.customer.email],
    quote.customer.phone ? ["Teléfono", quote.customer.phone] : null,
    ["Ciudad", quote.customer.city],
  ].filter((row): row is [string, string] => Boolean(row));

  const quoteLines = [
    ["N° cotización", quote.quoteNumber],
    quote.requestNumber ? ["Solicitud", quote.requestNumber] : null,
    quote.version ? ["Versión", String(quote.version)] : null,
    quote.status ? ["Estado", quoteStatusLabels[quote.status] || quote.status] : null,
    ["Fecha de emisión", formatDate(quote.createdAt)],
    ["Vigencia", quote.validUntil ? formatDate(quote.validUntil) : "Sin fecha de vencimiento"],
  ].filter((row): row is [string, string] => Boolean(row));

  const boxGap = 12;
  const boxWidth = (contentWidth - boxGap) / 2;
  const rowHeight = 14;
  const boxPadding = 12;
  const titleHeight = 18;
  const leftHeight = boxPadding * 2 + titleHeight + customerLines.length * rowHeight;
  const rightHeight = boxPadding * 2 + titleHeight + quoteLines.length * rowHeight;
  const infoHeight = Math.max(leftHeight, rightHeight);

  ensureSpace(infoHeight + 16);
  const infoTop = y;
  const drawInfoBox = (x: number, title: string, rows: Array<[string, string]>) => {
    page.drawRectangle({
      x,
      y: infoTop - infoHeight,
      width: boxWidth,
      height: infoHeight,
      color: canvas,
      borderColor: border,
      borderWidth: 0.8,
    });
    page.drawText(title, { x: x + boxPadding, y: infoTop - 16, size: 8, font: bold, color: blue });
    let rowY = infoTop - 34;
    for (const [label, value] of rows) {
      page.drawText(`${label}:`, { x: x + boxPadding, y: rowY, size: 8, font: bold, color: navy });
      const valueX = x + boxPadding + 78;
      const wrapped = wrap(value, regular, 8, x + boxWidth - boxPadding - valueX);
      page.drawText(wrapped[0] || value, { x: valueX, y: rowY, size: 8, font: regular, color: muted });
      rowY -= rowHeight;
    }
  };

  drawInfoBox(margin, "CLIENTE", customerLines);
  drawInfoBox(margin + boxWidth + boxGap, "DATOS DE LA COTIZACIÓN", quoteLines);
  y = infoTop - infoHeight - 16;

  drawTableHeader();

  if (!quote.items.length) {
    ensureSpace(28);
    page.drawText("Sin productos en esta cotización.", { x: productX, y: y - 12, size: 9, font: regular, color: muted });
    y -= 28;
  }

  quote.items.forEach((item, index) => {
    const nameLines = wrap(item.productName, bold, 9.5, productWidth);
    const details = itemDetailLines(item).flatMap((line) => wrap(line, regular, 7.5, productWidth));
    const blockHeight = 10 + nameLines.length * 12 + details.length * 10 + 10;

    if (y - blockHeight < contentBottom) {
      addPage();
      drawTableHeader();
    }

    const startY = y;
    if (index % 2 === 0) {
      page.drawRectangle({ x: margin, y: startY - blockHeight, width: contentWidth, height: blockHeight, color: canvas });
    }

    let textY = startY - 14;
    nameLines.forEach((line, lineIndex) => {
      page.drawText(line, { x: productX, y: textY, size: 9.5, font: bold, color: navy });
      if (lineIndex === 0) {
        drawRight(String(item.quantity), colQtyRight, textY, 9, regular);
        drawRight(money(item.unitPrice), colUnitRight, textY, 9, regular);
        drawRight(money(item.totalPrice), colTotalRight, textY, 9, bold);
      }
      textY -= 12;
    });

    for (const line of details) {
      page.drawText(line, { x: productX, y: textY, size: 7.5, font: regular, color: muted });
      textY -= 10;
    }

    y = startY - blockHeight;
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.4, color: border });
  });

  const totalBoxHeight = 46;
  ensureSpace(totalBoxHeight + 8);
  y -= 10;
  page.drawRectangle({
    x: pageWidth - margin - 220,
    y: y - totalBoxHeight,
    width: 220,
    height: totalBoxHeight,
    color: navyDark,
  });
  page.drawText("Total cotización", {
    x: pageWidth - margin - 204,
    y: y - 18,
    size: 8,
    font: regular,
    color: rgb(0.75, 0.82, 0.9),
  });
  page.drawText(money(quote.total), {
    x: pageWidth - margin - 204,
    y: y - 36,
    size: 14,
    font: bold,
    color: white,
  });
  y -= totalBoxHeight + 18;

  const notes = [
    `Vigencia: ${quote.validUntil ? formatDate(quote.validUntil) : "Sin fecha de vencimiento"}`,
    "Documento emitido por AXESSIA. Válido para compartir por medios digitales.",
    company ? `Emisor: ${company.legalName} · RUT ${company.legalRut}` : null,
  ].filter((line): line is string => Boolean(line));

  const noteLines = notes.flatMap((line) => wrap(line, regular, 8, contentWidth));
  ensureSpace(22 + noteLines.length * 12);
  page.drawText("CONDICIONES", { x: margin, y, size: 8, font: bold, color: blue });
  y -= 14;
  for (const line of noteLines) {
    page.drawText(line, { x: margin, y, size: 8, font: regular, color: muted });
    y -= 12;
  }

  const drawHeader = (target: PDFPage) => {
    target.drawRectangle({ x: 0, y: pageHeight - headerHeight, width: pageWidth, height: headerHeight, color: navyDark });
    target.drawRectangle({ x: 0, y: pageHeight - headerHeight, width: pageWidth * 0.42, height: 3, color: cyan });
    target.drawRectangle({ x: pageWidth * 0.42, y: pageHeight - headerHeight, width: pageWidth * 0.28, height: 3, color: blue });
    target.drawRectangle({ x: pageWidth * 0.7, y: pageHeight - headerHeight, width: pageWidth * 0.3, height: 3, color: purple });

    if (logo) {
      const logoHeight = 28;
      const logoWidth = Math.min(logo.width * (logoHeight / logo.height), 168);
      target.drawImage(logo, {
        x: margin,
        y: pageHeight - 22 - logoHeight,
        width: logoWidth,
        height: logoHeight,
      });
    } else {
      target.drawText("AXESSIA", { x: margin, y: pageHeight - 42, size: 18, font: bold, color: white });
    }

    const title = "COTIZACIÓN";
    const titleSize = 13;
    target.drawText(title, {
      x: pageWidth - margin - bold.widthOfTextAtSize(title, titleSize),
      y: pageHeight - 34,
      size: titleSize,
      font: bold,
      color: white,
    });
    const numberLabel = `N° ${quote.quoteNumber}`;
    target.drawText(numberLabel, {
      x: pageWidth - margin - regular.widthOfTextAtSize(numberLabel, 9),
      y: pageHeight - 50,
      size: 9,
      font: regular,
      color: rgb(0.78, 0.86, 0.95),
    });
  };

  const drawFooter = (target: PDFPage, index: number) => {
    target.drawLine({ start: { x: margin, y: 40 }, end: { x: pageWidth - margin, y: 40 }, thickness: 0.6, color: blue });
    target.drawText(`AXESSIA · ${quote.quoteNumber}`, { x: margin, y: 26, size: 8, font: regular, color: muted });
    const pageLabel = `Página ${index + 1} de ${pages.length}`;
    target.drawText(pageLabel, {
      x: pageWidth - margin - regular.widthOfTextAtSize(pageLabel, 8),
      y: 26,
      size: 8,
      font: regular,
      color: muted,
    });
    target.drawText("Acceso inteligente a soluciones de salud.  ·  +56 9 6732 9309  ·  +56 9 7992 8080", {
      x: margin,
      y: 14,
      size: 7,
      font: regular,
      color: muted,
    });
  };

  pages.forEach((target, index) => {
    drawHeader(target);
    drawFooter(target, index);
  });

  return pdf.save();
}