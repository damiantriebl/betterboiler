"use server";

import { auth } from "@/auth";
import { InventoryReportPDF } from "@/components/pdf/InventoryReportPDF";
import { getInventoryStatusReport } from "@/lib/reports/inventory";
import { renderToBuffer } from "@react-pdf/renderer";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function generateInventoryPDF(dateRange?: { from?: Date; to?: Date }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/auth/signin");
  }

  const data = await getInventoryStatusReport(dateRange);
  const pdf = await renderToBuffer(<InventoryReportPDF data={data} dateRange={dateRange} />);

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=inventory-report.pdf",
    },
  });
}
