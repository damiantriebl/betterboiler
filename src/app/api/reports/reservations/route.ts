import { getReservationsReport } from "@/actions/reports/get-reservations-report";
import { getOrganizationIdFromSession } from "@/actions/util";
import {
  createReservationReportPDFResponse,
  generateReservationReportPDF,
} from "@/lib/pdf-generators/reservation-report-pdf";
import type { ReportFilters } from "@/types/reports";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const org = await getOrganizationIdFromSession();
    if (!org.organizationId) {
      return new NextResponse("No organization found", { status: 401 });
    }

    const { dateRange, branchId, brandId } = await request.json();

    // Preparar los filtros para el reporte
    const filters: ReportFilters = {
      organizationId: org.organizationId,
      dateRange,
      branchId: branchId === "all" ? undefined : branchId,
      brandId: brandId === "all" ? undefined : brandId,
    };

    const report = await getReservationsReport(dateRange);

    // Generar el PDF usando pdf-lib con el template unificado
    const pdfBytes = await generateReservationReportPDF(report, dateRange);

    return createReservationReportPDFResponse(pdfBytes, "reporte-reservas.pdf");
  } catch (error) {
    console.error("Error generating reservations report:", error);
    return new NextResponse("Error generating report", { status: 500 });
  }
}
