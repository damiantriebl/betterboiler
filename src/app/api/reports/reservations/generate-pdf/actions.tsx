import { getReservationsReport } from "@/actions/reports/get-reservations-report";
import { getOrganizationIdFromSession } from "@/actions/util";
import {
  createReservationReportPDFResponse,
  generateReservationReportPDF as generateReservationPDF,
} from "@/lib/pdf-generators/reservation-report-pdf";
import type { DateRange } from "@/types/DateRange";
import type { ReservationsReport } from "@/types/reports";

export async function generateReservationReportPDF(dateRange?: DateRange): Promise<Buffer> {
  try {
    const org = await getOrganizationIdFromSession();
    if (!org.organizationId) {
      throw new Error("No organization found");
    }

    const reportData: ReservationsReport = await getReservationsReport(dateRange);

    // Generar el PDF usando pdf-lib
    const pdfBytes = await generateReservationPDF(reportData);

    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error("Error generating reservation PDF:", error);
    throw error;
  }
}
