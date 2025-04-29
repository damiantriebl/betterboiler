import { pdf } from "@react-pdf/renderer";
import { getReservationsReport } from "@/actions/reports/get-reservations-report";
import { ReservationReportPDF } from "@/components/reports/ReservationReportPDF";
import { DateRange } from "@/types/DateRange";
import type { ReportFilters } from "@/types/reports";
import { getOrganizationIdFromSession } from "@/actions/getOrganizationIdFromSession";

export async function generateReservationReportPDF(dateRange?: DateRange) {
    try {
        const organizationId = await getOrganizationIdFromSession();
        if (!organizationId) {
            throw new Error("No organization found");
        }

        // Preparar los filtros para el reporte
        const filters: ReportFilters = {
            dateRange,
            organizationId
        };

        const reportData = await getReservationsReport(filters);

        // Transformar los datos al formato esperado por ReservationReportPDF
        const report = {
            reservations: reportData.byClient.flatMap(client =>
                client.reservations.map(res => ({
                    date: res.date,
                    customerName: client.client.name,
                    model: `${res.motorcycle.brand} ${res.motorcycle.model}`,
                    amount: res.amount
                }))
            ),
            totalReservations: reportData.summary.totalReservations,
            totalAmount: Object.values(reportData.summary.totalsByCurrency).reduce(
                (total, curr) => total + curr.reservedAmount,
                0
            )
        };

        // Generar el PDF
        const doc = pdf(<ReservationReportPDF report={report} />);
        const buffer = await doc.toBuffer();

        return buffer;
    } catch (error) {
        console.error("Error generating reservation PDF:", error);
        throw error;
    }
} 