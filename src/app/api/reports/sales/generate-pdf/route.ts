import { getOrganizationIdFromSession } from "@/actions/getOrganizationIdFromSession";
import type { ReportFilters } from "@/types/SalesReportType";
import { type NextRequest, NextResponse } from "next/server";
import { generateSalesReportPDF } from "./actions";

export async function POST(request: NextRequest) {
  try {
    const organizationId = await getOrganizationIdFromSession();
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 401 });
    }

    const filters = (await request.json()) as ReportFilters;
    filters.organizationId = organizationId;

    const pdfBuffer = await generateSalesReportPDF(filters);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="reporte-ventas.pdf"',
      },
    });
  } catch (error) {
    console.error("Error generating sales PDF:", error);
    return NextResponse.json({ error: "Error generating sales PDF" }, { status: 500 });
  }
}
