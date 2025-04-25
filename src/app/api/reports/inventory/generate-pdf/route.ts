import { NextRequest, NextResponse } from "next/server";
import { generateInventoryReportPDF } from "./actions";

export async function POST(request: NextRequest) {
  try {
    const { dateRange } = await request.json();
    const response = await generateInventoryReportPDF(dateRange);
    const pdfBuffer = await response.arrayBuffer();
    
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=inventory-report.pdf",
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new NextResponse("Error generating PDF", { status: 500 });
  }
} 