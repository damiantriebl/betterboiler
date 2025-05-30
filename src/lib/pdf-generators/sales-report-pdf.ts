import { PDFBuilder, colors, fontSizes, margins } from "@/lib/pdf-lib-utils";
import type { SalesReport } from "@/types/reports";
import { type PDFSection, PDFSectionHelpers, PDFTemplate, createPDFResponse } from "./pdf-template";

export async function generateSalesReportPDF(
  data: SalesReport,
  dateRange?: { from?: Date; to?: Date },
): Promise<Uint8Array> {
  // Crear template
  const template = new PDFTemplate({
    title: "Reporte de Ventas",
    subtitle: "Análisis de Ventas por Período",
    dateRange,
    filename: "reporte-ventas.pdf",
  });

  await template.init();

  // Definir secciones del reporte
  const sections: PDFSection[] = [
    // Sección Resumen de Ventas
    {
      title: "Resumen General de Ventas",
      content: PDFSectionHelpers.createSummarySection({
        "Total de Ventas": data.summary.totalSales,
        "Precio Promedio (ARS)": data.summary.averagePrice.ARS
          ? `$${data.summary.averagePrice.ARS.toLocaleString("es-AR")}`
          : "N/A",
        "Precio Promedio (USD)": data.summary.averagePrice.USD
          ? `$${data.summary.averagePrice.USD.toLocaleString("en-US")}`
          : "N/A",
      }),
    },

    // Sección Ingresos por Moneda
    {
      title: "Ingresos Totales por Moneda",
      content: PDFSectionHelpers.createTableSection(
        ["Moneda", "Ingresos Totales", "Ganancia Total"],
        Object.entries(data.summary.totalRevenue).map(([currency, revenue]) => [
          currency,
          new Intl.NumberFormat(currency === "ARS" ? "es-AR" : "en-US", {
            style: "currency",
            currency,
          }).format(revenue),
          new Intl.NumberFormat(currency === "ARS" ? "es-AR" : "en-US", {
            style: "currency",
            currency,
          }).format(data.summary.totalProfit[currency] || 0),
        ]),
        { cellHeight: 25 },
      ),
      minSpaceRequired: 200,
    },

    // Sección Ventas por Vendedor
    {
      title: "Ventas por Vendedor",
      content: PDFSectionHelpers.createTableSection(
        ["Vendedor", "Cantidad de Ventas", "Ingresos (ARS)", "Ingresos (USD)"],
        Object.entries(data.salesBySeller).map(([sellerId, sellerData]) => [
          sellerData.name,
          sellerData.count.toString(),
          sellerData.revenue.ARS ? `$${sellerData.revenue.ARS.toLocaleString("es-AR")}` : "$0",
          sellerData.revenue.USD ? `$${sellerData.revenue.USD.toLocaleString("en-US")}` : "$0",
        ]),
        { cellHeight: 22, fontSize: fontSizes.small },
      ),
      minSpaceRequired: 250,
    },

    // Sección Ventas por Sucursal
    {
      title: "Ventas por Sucursal",
      content: PDFSectionHelpers.createTableSection(
        ["Sucursal", "Cantidad de Ventas", "Ingresos (ARS)", "Ingresos (USD)"],
        Object.entries(data.salesByBranch).map(([branchId, branchData]) => [
          branchData.name,
          branchData.count.toString(),
          branchData.revenue.ARS ? `$${branchData.revenue.ARS.toLocaleString("es-AR")}` : "$0",
          branchData.revenue.USD ? `$${branchData.revenue.USD.toLocaleString("en-US")}` : "$0",
        ]),
        { cellHeight: 22, fontSize: fontSizes.small },
      ),
      minSpaceRequired: 200,
    },

    // Sección Ventas por Mes (si hay datos)
    ...(Object.keys(data.salesByMonth).length > 0
      ? [
          {
            title: "Evolución Mensual de Ventas",
            newPageBefore: true,
            content: PDFSectionHelpers.createTableSection(
              ["Mes", "Cantidad de Ventas", "Ingresos (ARS)", "Ingresos (USD)"],
              Object.entries(data.salesByMonth).map(([month, monthData]) => [
                month,
                monthData.count.toString(),
                monthData.revenue.ARS ? `$${monthData.revenue.ARS.toLocaleString("es-AR")}` : "$0",
                monthData.revenue.USD ? `$${monthData.revenue.USD.toLocaleString("en-US")}` : "$0",
              ]),
              { cellHeight: 22, fontSize: fontSizes.small },
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
export function createSalesReportPDFResponse(
  pdfBytes: Uint8Array,
  filename = "reporte-ventas.pdf",
): Response {
  return createPDFResponse(pdfBytes, filename);
}
