import { getReservationsReport } from "@/actions/reports/get-reservations-report";
import { getOrganizationIdFromSession } from "@/actions/util";
import {
  createReservationReportPDFResponse,
  generateReservationReportPDF,
} from "@/lib/pdf-generators/reservation-report-pdf";
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

    // Generar el PDF usando pdf-lib con el template unificado
    const pdfBytes = await generateReservationReportPDF(report, dateRange);

    return createReservationReportPDFResponse(pdfBytes, "reporte-reservas.pdf");
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new Response("Error al generar el PDF", { status: 500 });
  }
}
