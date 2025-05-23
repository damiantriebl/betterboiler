import { getOrganizationIdFromSession } from "@/actions/get-Organization-Id-From-Session";
import { getReservationsReport } from "@/actions/reports/get-reservations-report";
import { generateReservationReportPDF, createReservationReportPDFResponse } from "@/lib/pdf-generators/reservation-report-pdf";
import type { ReservationsReport } from "@/types/reports";

export async function POST(request: Request) {
  try {
    const org = await getOrganizationIdFromSession();
    if (!org.organizationId) {
      return new Response("No autorizado", { status: 401 });
    }

    const data = await request.json();
    const { dateRange } = data;

    const report: ReservationsReport = await getReservationsReport(dateRange);

    if (!report) {
      throw new Error("No se pudo generar el reporte");
    }

    // Generar el PDF usando pdf-lib
    const pdfBytes = await generateReservationReportPDF(report);

    return createReservationReportPDFResponse(pdfBytes, "reporte-reservas.pdf");
    
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new Response("Error al generar el PDF", { status: 500 });
  }
}
