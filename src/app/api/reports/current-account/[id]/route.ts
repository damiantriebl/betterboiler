import { getCurrentAccountForReport } from "@/actions/current-accounts/get-current-account-for-report";
import {
  createCurrentAccountPDFResponse,
  generateCurrentAccountPDF,
} from "@/lib/pdf-generators/current-account-pdf";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return new Response(JSON.stringify({ error: "ID de cuenta requerido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Obtener datos de la cuenta corriente
    const accountData = await getCurrentAccountForReport(id);

    if (!accountData) {
      return new Response(JSON.stringify({ error: "Cuenta corriente no encontrada" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Generar el PDF usando pdf-lib
    const pdfBytes = await generateCurrentAccountPDF(accountData);

    // Crear nombre del archivo
    const fileName = `Reporte_CC_${accountData.client.lastName || "Cliente"}_${accountData.motorcycle?.chassisNumber || accountData.id}.pdf`;

    // Crear y retornar la respuesta HTTP
    return createCurrentAccountPDFResponse(pdfBytes, fileName);
  } catch (error) {
    console.error("Error generando PDF de cuenta corriente:", error);
    return new Response(JSON.stringify({ error: "Error generando el reporte PDF" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
