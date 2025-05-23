"use server";

import { auth } from "@/auth";
import { generateInventoryReportPDF as generateInventoryPDF, createInventoryReportPDFResponse } from "@/lib/pdf-generators/inventory-report-pdf";
import { getInventoryStatusReport } from "@/lib/reports/inventory";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function generateInventoryReportPDF(dateRange?: { from?: Date; to?: Date }): Promise<Response> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/auth/signin");
  }

  const data = await getInventoryStatusReport(dateRange);
  const pdfBytes = await generateInventoryPDF(data, dateRange);

  return createInventoryReportPDFResponse(pdfBytes, 'reporte-inventario.pdf');
}
