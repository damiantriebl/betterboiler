import { getOrganizationIdFromSession } from "@/actions/get-Organization-Id-From-Session";
import { getReservationsReport } from "@/actions/reports/get-reservations-report";
import { ReservationReportPDF } from "@/components/reports/ReservationReportPDF";
import type { ReservationsReport } from "@/types/reports";
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import type { Readable } from 'stream'; // Importar Readable de Node.js

// Helper para convertir Readable (Node.js stream) a Buffer
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

export async function POST(request: Request) {
  try {
    const org = await getOrganizationIdFromSession();
    if (!org.organizationId) {
      return new Response("No autorizado", { status: 401 });
    }

    const data = await request.json();
    const { dateRange, branchId, brandId } = data;

    const report: ReservationsReport = await getReservationsReport({
      organizationId: org.organizationId,
      dateRange,
      branchId: branchId === "all" ? undefined : branchId,
      brandId: brandId === "all" ? undefined : brandId,
    });

    if (!report) {
      throw new Error("No se pudo generar el reporte");
    }

    const reportElement = createElement(ReservationReportPDF, { report });
    // @ts-expect-error El linter tiene problemas para reconocer el tipo aquí, pero funciona en ejecución
    const doc = pdf(reportElement);
    const pdfStream = await doc.toBuffer(); // Devuelve Promise<ReadableStream> según el linter
                                          // Asumimos que este ReadableStream es compatible con Node.js Readable
    const finalPdfBuffer = await streamToBuffer(pdfStream as Readable); // Cast a Readable

    // Convertir Node.js Buffer (resultado de streamToBuffer) a ArrayBuffer para new Response()
    // Creando una copia para asegurar que es un ArrayBuffer simple y no SharedArrayBuffer
    const arrayBuffer = new ArrayBuffer(finalPdfBuffer.length);
    const view = new Uint8Array(arrayBuffer);
    for (let i = 0; i < finalPdfBuffer.length; ++i) {
      view[i] = finalPdfBuffer[i];
    }

    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="reporte-reservas.pdf"',
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new Response("Error al generar el PDF", { status: 500 });
  }
}
