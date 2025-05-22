import type { ReportFilters } from "@/types/SalesReportType";
import { type NextRequest, NextResponse } from "next/server";
import { generateSalesReportPDF } from "./actions";
import { Readable } from "stream";
import { getOrganizationIdFromSession } from "@/actions/get-Organization-Id-From-Session";

export async function POST(request: NextRequest) {
  try {
    const org = await getOrganizationIdFromSession();
    
    if (org.error || !org.organizationId) {
      return NextResponse.json({ error: org.error || "Organization ID not found in session" }, { status: 401 });
    }

    const filters = (await request.json()) as ReportFilters;
    filters.organizationId = org.organizationId;

    const pdfBuffer = await generateSalesReportPDF(filters);
    const stream = Readable.from(pdfBuffer);

    return new NextResponse(stream as any, {
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
