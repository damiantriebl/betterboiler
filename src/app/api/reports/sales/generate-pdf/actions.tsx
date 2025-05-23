import { getSalesReport } from "@/actions/reports/get-sales-report";
import { generateSalesReportPDF as generateSalesPDF, createPDFResponse } from "@/lib/pdf-generators/sales-report-pdf";
import type { ReportFilters } from "@/types/SalesReportType";

export async function generateSalesReportPDF(filters: ReportFilters): Promise<Buffer> {
  const report = await getSalesReport(
    filters.dateRange
      ? {
        from: filters.dateRange.from,
        to: filters.dateRange.to,
      }
      : undefined,
  );

  const pdfBytes = await generateSalesPDF(report);

  return Buffer.from(pdfBytes);
}
