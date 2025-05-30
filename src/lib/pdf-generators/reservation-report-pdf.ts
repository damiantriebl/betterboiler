import { PDFBuilder, colors, fontSizes, margins } from "@/lib/pdf-lib-utils";
import type { ReservationsReport } from "@/types/reports";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { type PDFSection, PDFSectionHelpers, PDFTemplate, createPDFResponse } from "./pdf-template";

// Función para traducir estados al español
const translateStatus = (status: string): string => {
  const translations: Record<string, string> = {
    active: "Activa",
    completed: "Completada",
    cancelled: "Cancelada",
    expired: "Expirada",
  };
  return translations[status] || status;
};

export async function generateReservationReportPDF(
  data: ReservationsReport,
  dateRange?: { from?: Date; to?: Date },
): Promise<Uint8Array> {
  // Crear template
  const template = new PDFTemplate({
    title: "Reporte de Reservas",
    subtitle: "Análisis de Reservaciones por Período",
    dateRange,
    filename: "reporte-reservas.pdf",
  });

  await template.init();

  // Verificar si hay datos
  const hasData = data.summary.totalReservations > 0;

  // Definir secciones del reporte
  const sections: PDFSection[] = [
    // Sección Resumen General
    {
      title: "Resumen General",
      content: hasData
        ? PDFSectionHelpers.createSummarySection({
            "Total de Reservas": data.summary.totalReservations,
            "Reservas Activas": data.summary.activeReservations,
            "Reservas Completadas": data.summary.completedReservations,
            "Reservas Canceladas": data.summary.cancelledReservations,
            "Reservas Expiradas": data.summary.expiredReservations,
            "Tasa de Conversión": `${data.summary.conversionRate.toFixed(2)}%`,
          })
        : PDFSectionHelpers.createTextSection(
            "No hay reservas registradas en el período seleccionado.",
            {
              fontSize: fontSizes.medium,
              centered: true,
              color: colors.textSecondary,
            },
          ),
    },

    // Sección Montos Totales (solo si hay datos)
    ...(hasData && Object.keys(data.summary.totalAmount).length > 0
      ? [
          {
            title: "Montos Totales por Moneda",
            content: PDFSectionHelpers.createTableSection(
              ["Moneda", "Monto Total"],
              Object.entries(data.summary.totalAmount).map(([currency, amount]) => [
                currency,
                new Intl.NumberFormat("es-AR", {
                  style: "currency",
                  currency,
                }).format(amount),
              ]),
              { cellHeight: 30, fontSize: fontSizes.normal },
            ),
            minSpaceRequired: 200,
          },
        ]
      : []),

    // Sección Reservas por Estado (solo si hay datos)
    ...(hasData && Object.keys(data.reservationsByStatus).length > 0
      ? [
          {
            title: "Reservas por Estado",
            content: PDFSectionHelpers.createTableSection(
              ["Estado", "Cantidad", "Monto Total"],
              Object.entries(data.reservationsByStatus).map(([status, info]) => {
                const totalAmount =
                  Object.entries(info.amount)
                    .map(
                      ([currency, amount]) =>
                        `${currency}: ${new Intl.NumberFormat("es-AR", {
                          style: "currency",
                          currency,
                        }).format(amount)}`,
                    )
                    .join(", ") || "Sin monto";

                return [translateStatus(status), info.count.toString(), totalAmount];
              }),
              { cellHeight: 32, fontSize: fontSizes.normal },
            ),
            minSpaceRequired: 250,
          },
        ]
      : []),

    // Sección Reservas por Sucursal (solo si hay datos)
    ...(hasData && Object.keys(data.reservationsByBranch).length > 0
      ? [
          {
            title: "Reservas por Sucursal",
            newPageBefore: true,
            content: PDFSectionHelpers.createTableSection(
              ["Sucursal", "Total", "Activas", "Completadas", "Canceladas", "Expiradas"],
              Object.entries(data.reservationsByBranch).map(([branchId, branchData]) => [
                `Sucursal ${branchId}`,
                branchData.total.toString(),
                branchData.active.toString(),
                branchData.completed.toString(),
                branchData.cancelled.toString(),
                branchData.expired.toString(),
              ]),
              { cellHeight: 28, fontSize: fontSizes.small },
            ),
          },
        ]
      : []),
  ];

  // Agregar todas las secciones
  await template.addSections(sections);

  // Finalizar y retornar
  return template.finalize();
}

// Función para crear una respuesta HTTP con el PDF
export function createReservationReportPDFResponse(
  pdfBytes: Uint8Array,
  filename = "reporte-reservas.pdf",
): Response {
  return createPDFResponse(pdfBytes, filename);
}
