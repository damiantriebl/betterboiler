import { getCurrentAccountsReport } from "@/actions/reports/get-current-accounts-report";
import { getOrganizationIdFromSession } from "@/actions/util";
import {
  createCurrentAccountsReportPDFResponse,
  generateCurrentAccountsReportPDF,
} from "@/lib/pdf-generators/current-accounts-report-pdf";
import type { DateRange } from "@/types/DateRange";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const org = await getOrganizationIdFromSession();
    if (!org.organizationId) {
      return new NextResponse("No organization found", { status: 401 });
    }

    const { dateRange, branchId, status } = await request.json();

    // Obtener el reporte de cuentas corrientes
    const report = await getCurrentAccountsReport(dateRange, branchId, status);

    // Generar el PDF usando pdf-lib con el template unificado
    const pdfBytes = await generateCurrentAccountsReportPDF(report, dateRange);

    return createCurrentAccountsReportPDFResponse(pdfBytes, "reporte-cuentas-corrientes.pdf");
  } catch (error) {
    console.error("Error generating current accounts report:", error);
    return new NextResponse("Error generating report", { status: 500 });
  }
}
