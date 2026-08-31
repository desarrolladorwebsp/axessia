import { NextResponse } from "next/server";
import { getAxessiaLegalDetails } from "@/lib/axessia-legal";
import { readDevQuoteRequests, shouldUseJsonStorage } from "@/lib/dev-request-store";
import { generateMandatePdf } from "@/lib/mandate";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ requestId: string }> };

function pdfResponse(pdf: Uint8Array, fileName: string) {
  const body = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
  return new NextResponse(body, { headers: { "Content-Disposition": `inline; filename="${fileName}"`, "Content-Type": "application/pdf" } });
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { requestId } = await params;
  const company = getAxessiaLegalDetails();
  if (!company) return NextResponse.json({ error: "Falta la configuración legal de AXESSIA." }, { status: 409 });

  try {
    if (shouldUseJsonStorage()) {
      const record = (await readDevQuoteRequests()).find((item) => item.id === requestId && item.generatedMandate);
      if (!record?.generatedMandate) return NextResponse.json({ error: "Mandato no encontrado." }, { status: 404 });
      const pdf = await generateMandatePdf({ requestNumber: record.requestNumber, mandateName: record.patientName || record.requesterName, mandateRut: record.patientRut || record.requesterRut, condition: null, medications: record.medications }, company);
      return pdfResponse(pdf, record.generatedMandate.fileName);
    }

    const mandate = await prisma.generatedMandate.findUnique({ where: { requestId }, select: { fileName: true, request: { select: { requestNumber: true, requesterName: true, requesterRut: true, patientName: true, patientRut: true, medications: { select: { commercialName: true, activeIngredient: true } } } } } });
    const requestNumber = mandate?.request.requestNumber;
    if (!mandate || !requestNumber) return NextResponse.json({ error: "Mandato no encontrado." }, { status: 404 });
    const request = mandate.request;
    const pdf = await generateMandatePdf({ requestNumber, mandateName: request.patientName || request.requesterName, mandateRut: request.patientRut || request.requesterRut, condition: null, medications: request.medications }, company);
    return pdfResponse(pdf, mandate.fileName);
  } catch (error) {
    console.error("Error generating mandate PDF:", error);
    return NextResponse.json({ error: "No fue posible generar el mandato." }, { status: 500 });
  }
}