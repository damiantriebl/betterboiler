"use server";

import { getInventoryStatusReportForPDF } from "@/actions/reports/get-inventory-report-unified";
import { auth } from "@/auth";
import {
  createInventoryReportPDFResponse,
  generateInventoryReportPDF as generateInventoryPDF,
} from "@/lib/pdf-generators/inventory-report-pdf";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function generateInventoryReportPDF(dateRange?: {
  from?: Date;
  to?: Date;
}): Promise<Response> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/auth/signin");
  }

  const data = await getInventoryStatusReportForPDF(dateRange);
  const pdfBytes = await generateInventoryPDF(data, dateRange);

  return createInventoryReportPDFResponse(pdfBytes, "reporte-inventario.pdf");
}
