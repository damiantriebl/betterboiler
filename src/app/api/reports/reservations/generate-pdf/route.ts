import { getOrganizationIdFromSession } from "@/actions/getOrganizationIdFromSession";
import { getReservationsReport } from "@/actions/reports/get-reservations-report";
import type { ReservationReportPDF } from "@/components/pdf/ReservationReportPDF";
import type { ReservationsReport } from "@/types/reports";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { createElement } from "react";

export async function POST(request: Request) {
    try {
        const organizationId = await getOrganizationIdFromSession();
        if (!organizationId) {
            return new Response("No autorizado", { status: 401 });
        }

        const data = await request.json();
        const { dateRange, branchId, brandId } = data;

        // Obtener el reporte con los filtros
        const report = await getReservationsReport({
            organizationId,
            dateRange,
            branchId: branchId === "all" ? undefined : branchId,
            brandId: brandId === "all" ? undefined : brandId,
        });

        if (!report) {
            throw new Error("No se pudo generar el reporte");
        }

        // Generar el PDF usando createElement
        const pdfBuffer = await renderToBuffer(
          createElement(ReservationReportPDF, { report })
        );

        // Convertir el buffer a Uint8Array para la respuesta
        const pdfArray = new Uint8Array(pdfBuffer);

        return new Response(pdfArray, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": 'attachment; filename="reporte-reservas.pdf"',
            },
        });
    } catch (error) {
        console.error("Error generating PDF:", error);
        return new Response("Error al generar el PDF", { status: 500 });
    }
}
