import { getSalesReport } from "@/actions/reports/get-sales-report";
import SalesReportPDF from "@/components/reports/SalesReportPDF";
import type { ReportFilters } from "@/types/SalesReportType";
import { renderToStream } from "@react-pdf/renderer";

export async function generateSalesReportPDF(filters: ReportFilters): Promise<Buffer> {
  const report = await getSalesReport(
    filters.dateRange
      ? {
          from: filters.dateRange.from,
          to: filters.dateRange.to,
        }
      : undefined,
  );

  const stream = await renderToStream(<SalesReportPDF report={report} />);

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    if (typeof chunk === "string") {
      chunks.push(Buffer.from(chunk, "utf-8"));
    } else {
      chunks.push(Buffer.from(chunk));
    }
  }

  return Buffer.concat(chunks);
}
