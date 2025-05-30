"use server";

import { getInventoryStatusReport } from "@/actions/reports/get-inventory-report-unified";
import { auth } from "@/auth";
import {
  createInventoryReportPDFResponse,
  generateInventoryReportPDF,
} from "@/lib/pdf-generators/inventory-report-pdf";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function generateInventoryPDF(dateRange?: { from?: Date; to?: Date }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/auth/signin");
  }

  const data = await getInventoryStatusReport(dateRange);
  const pdfBytes = await generateInventoryReportPDF(data, dateRange);

  return createInventoryReportPDFResponse(pdfBytes, "reporte-inventario.pdf");
}
