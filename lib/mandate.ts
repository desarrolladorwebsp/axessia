import { promises as fs } from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { AxessiaLegalDetails } from "@/lib/axessia-legal";

export type MandateRequestData = {
  requestNumber: string;
  mandateName: string;
  mandateRut: string;
  condition: string | null;
  medications: Array<{ commercialName: string; activeIngredient: string }>;
};

const navy = rgb(7 / 255, 30 / 255, 65 / 255);
const blue = rgb(8 / 255, 127 / 255, 213 / 255);
const muted = rgb(79 / 255, 95 / 255, 115 / 255);

function wrap(text: string, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, size: number, width: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export async function generateMandatePdf(request: MandateRequestData, company: AxessiaLegalDetails) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const margin = 56;
  let cursor = height - 72;

  try {
    const logoBytes = await fs.readFile(path.join(process.cwd(), "public", "images", "logo-axessia.png"));
    const logo = await pdf.embedPng(logoBytes);
    const logoHeight = 30;
    page.drawImage(logo, { x: margin, y: cursor - logoHeight, width: logo.width * (logoHeight / logo.height), height: logoHeight });
  } catch {
    page.drawText("AXESSIA", { x: margin, y: cursor - 19, size: 18, font: bold, color: navy });
  }

  const title = "MANDATO";
  page.drawText(title, { x: (width - bold.widthOfTextAtSize(title, 17)) / 2, y: cursor - 25, size: 17, font: bold, color: navy });
  page.drawLine({ start: { x: margin, y: cursor - 48 }, end: { x: width - margin, y: cursor - 48 }, thickness: 1.5, color: blue });
  cursor -= 78;

  const medicationDescription = request.medications.map((item) => item.activeIngredient ? `${item.commercialName} (${item.activeIngredient})` : item.commercialName).join(", ");
  const conditionText = request.condition ? `, en relación con mi condición de ${request.condition}` : "";
  const body = `Por medio del presente, yo ${request.mandateName}, RUT ${request.mandateRut}${conditionText}, autorizo a ${company.legalName}, RUT ${company.legalRut}, para que realice en mi representación los trámites necesarios ante el Instituto de Salud Pública y demás organismos que correspondan, relacionados con la gestión del medicamento ${medicationDescription}, conforme a los antecedentes de mi solicitud ${request.requestNumber}.`;
  for (const line of wrap(body, regular, 10.5, width - margin * 2)) {
    page.drawText(line, { x: margin, y: cursor, size: 10.5, font: regular, color: navy });
    cursor -= 16;
  }

  cursor -= 18;
  page.drawText("IDENTIFICACIÓN DEL MANDANTE", { x: margin, y: cursor, size: 10, font: bold, color: blue });
  cursor -= 16;
  const fields = [
    ["Nombre completo", request.mandateName],
    ["RUT", request.mandateRut],
    ["Solicitud", request.requestNumber],
    ["Medicamento", medicationDescription],
  ];
  for (const [label, value] of fields) {
    page.drawText(`${label}:`, { x: margin, y: cursor, size: 9.5, font: bold, color: navy });
    page.drawText(value, { x: margin + 98, y: cursor, size: 9.5, font: regular, color: muted, maxWidth: width - margin * 2 - 98 });
    cursor -= 19;
  }

  cursor -= 28;
  page.drawLine({ start: { x: margin, y: cursor }, end: { x: margin + 185, y: cursor }, thickness: 0.8, color: navy });
  page.drawText("Firma del mandante", { x: margin, y: cursor - 16, size: 9, font: bold, color: navy });
  page.drawText(`Nombre: ${request.mandateName}`, { x: margin, y: cursor - 31, size: 9, font: regular, color: muted });
  page.drawText(`RUT: ${request.mandateRut}`, { x: margin, y: cursor - 45, size: 9, font: regular, color: muted });

  page.drawRectangle({ x: width - margin - 190, y: cursor - 95, width: 190, height: 92, borderColor: muted, borderWidth: 0.7 });
  page.drawText("ESPACIO PARA CERTIFICACIÓN", { x: width - margin - 174, y: cursor - 21, size: 8, font: bold, color: muted });
  page.drawText("NOTARIAL", { x: width - margin - 128, y: cursor - 35, size: 8, font: bold, color: muted });
  page.drawText(`Emitido por AXESSIA · ${request.requestNumber}`, { x: margin, y: 38, size: 8, font: regular, color: muted });

  return pdf.save();
}