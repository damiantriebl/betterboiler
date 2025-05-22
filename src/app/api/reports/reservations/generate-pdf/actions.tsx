import { getOrganizationIdFromSession } from "@/actions/get-Organization-Id-From-Session";
import { getReservationsReport } from "@/actions/reports/get-reservations-report";
import { ReservationReportPDF } from "@/components/reports/ReservationReportPDF";
import type { DateRange } from "@/types/DateRange";
import type { ReportFilters, ReservationsReport } from "@/types/reports";
import { pdf } from "@react-pdf/renderer";

export async function generateReservationReportPDF(dateRange?: DateRange) {
  try {
    const org = await getOrganizationIdFromSession();
    if (!org.organizationId) {
      throw new Error("No organization found");
    }

    // Preparar los filtros para el reporte
    const filters: ReportFilters = {
      dateRange,
      organizationId: org.organizationId,
    };

    const reportData: ReservationsReport = await getReservationsReport(filters);

    // Generar el PDF
    const doc = pdf(<ReservationReportPDF report={reportData} />);
    const buffer = await doc.toBuffer();

    return buffer;
  } catch (error) {
    console.error("Error generating reservation PDF:", error);
    throw error;
  }
}
