import { NextRequest, NextResponse } from "next/server";
import { getReservationsReport } from "@/actions/reports/get-reservations-report";
import { getOrganizationIdFromSession } from "@/actions/getOrganizationIdFromSession";
import type { ReportFilters } from "@/types/reports";

export async function POST(request: NextRequest) {
    try {
        const organizationId = await getOrganizationIdFromSession();
        if (!organizationId) {
            return new NextResponse("No organization found", { status: 401 });
        }

        const { dateRange, branchId, brandId } = await request.json();

        // Preparar los filtros para el reporte
        const filters: ReportFilters = {
            organizationId,
            dateRange,
            branchId: branchId === "all" ? undefined : branchId,
            brandId: brandId === "all" ? undefined : brandId,
        };

        const report = await getReservationsReport(filters);
        return NextResponse.json(report);
    } catch (error) {
        console.error("Error generating reservations report:", error);
        return new NextResponse("Error generating report", { status: 500 });
    }
} 