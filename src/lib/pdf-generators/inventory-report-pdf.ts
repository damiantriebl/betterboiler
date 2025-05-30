import { type PDFBuilder, colors, fontSizes, margins } from "@/lib/pdf-lib-utils";
import type { InventoryStatusReport } from "@/types/reports";
import { type PDFSection, PDFSectionHelpers, PDFTemplate, createPDFResponse } from "./pdf-template";

export async function generateInventoryReportPDF(
  data: InventoryStatusReport,
  dateRange?: { from?: Date; to?: Date },
): Promise<Uint8Array> {
  // Crear template
  const template = new PDFTemplate({
    title: "Reporte de Inventario",
    dateRange,
    filename: "reporte-inventario.pdf",
  });

  await template.init();

  // Definir secciones del reporte
  const sections: PDFSection[] = [
    // Sección Resumen General
    {
      title: "Resumen General",
      content: PDFSectionHelpers.createSummarySection({
        "Total de Motocicletas": data.summary.total,
        "En Stock (Disponibles)": data.summary.inStock,
        Reservadas: data.summary.reserved,
        Vendidas: data.summary.sold,
      }),
    },

    // Sección Distribución por Estado
    {
      title: "Distribución por Estado",
      content: PDFSectionHelpers.createTableSection(
        ["Estado", "Cantidad", "Porcentaje"],
        data.byState.map((item) => [
          item.state.replace("_", " ").toUpperCase(),
          item._count.toString(),
          `${((item._count / data.summary.total) * 100).toFixed(1)}%`,
        ]),
        { cellHeight: 30, fontSize: fontSizes.normal },
      ),
      minSpaceRequired: 250,
    },

    // Sección Distribución por Marca
    {
      title: "Distribución por Marca",
      content: PDFSectionHelpers.createTableSection(
        ["Marca", "Cantidad", "Porcentaje"],
        data.byBrand.map((item) => [
          item.brandName,
          item._count.toString(),
          `${((item._count / data.summary.total) * 100).toFixed(1)}%`,
        ]),
        { cellHeight: 30, fontSize: fontSizes.normal },
      ),
      minSpaceRequired: 200,
    },

    // Sección Análisis de Valores (si hay datos)
    ...(data.valueByState && data.valueByState.length > 0
      ? [
          {
            title: "Análisis de Valores por Estado",
            content: PDFSectionHelpers.createTableSection(
              ["Estado", "Moneda", "Valor de Venta Total", "Costo Total"],
              data.valueByState.map((item) => [
                item.state.replace("_", " ").toUpperCase(),
                item.currency,
                new Intl.NumberFormat("es-AR", {
                  style: "currency",
                  currency: item.currency,
                }).format(item._sum.retailPrice || 0),
                new Intl.NumberFormat("es-AR", {
                  style: "currency",
                  currency: item.currency,
                }).format(item._sum.costPrice || 0),
              ]),
              { cellHeight: 32, fontSize: fontSizes.small },
            ),
            minSpaceRequired: 220,
          },
        ]
      : []),

    // Sección Detalle de Motos Disponibles (si hay datos)
    ...(data.availableMotorcycles && data.availableMotorcycles.length > 0
      ? [
          {
            title: "Detalle de Motocicletas Disponibles",
            newPageBefore: true,
            content: (pdf: PDFBuilder, currentY: number, contentWidth: number) => {
              let yPosition = currentY;
              // Información adicional con mejor estilo
              pdf.addCenteredTitle(
                `Total de motos en stock: ${data.availableMotorcycles?.length}`,
                yPosition,
                fontSizes.large,
                colors.accent,
              );
              yPosition -= 50;

              // Preparar datos de las motos
              const motoHeaders = ["Marca/Modelo", "Año", "Chasis", "Color", "Precio", "Sucursal"];
              const motoRows = data.availableMotorcycles?.map((moto) => [
                `${moto.brand?.name || "N/A"} ${moto.model?.name || "N/A"}`,
                moto.year.toString(),
                moto.chassisNumber,
                moto.color?.name || "N/A",
                new Intl.NumberFormat("es-AR", {
                  style: "currency",
                  currency: moto.currency,
                }).format(moto.retailPrice),
                moto.branch?.name || "N/A",
              ]);

              // Dividir en grupos si hay muchas motos (máximo 20 por página para mejor legibilidad)
              const itemsPerPage = 20;
              let startIndex = 0;

              while (startIndex < (motoRows?.length || 0)) {
                if (startIndex > 0) {
                  pdf.addPage();
                  yPosition = template.getHeight() - margins.normal;
                  pdf.addCenteredTitle(
                    "Detalle de Motocicletas Disponibles (continuación)",
                    yPosition,
                    fontSizes.xlarge,
                    colors.primary,
                  );
                  yPosition -= 50;
                }

                const endIndex = Math.min(startIndex + itemsPerPage, motoRows?.length || 0);
                const pageRows = motoRows?.slice(startIndex, endIndex) || [];

                yPosition = pdf.addTable({
                  x: margins.normal,
                  y: yPosition,
                  width: contentWidth,
                  cellHeight: 28,
                  headers: motoHeaders,
                  rows: pageRows,
                  fontSize: fontSizes.small,
                  headerColor: colors.primary,
                  textColor: colors.textPrimary,
                  borderColor: colors.borderLight,
                });

                startIndex = endIndex;
              }

              return yPosition;
            },
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
export function createInventoryReportPDFResponse(
  pdfBytes: Uint8Array,
  filename = "reporte-inventario.pdf",
): Response {
  return createPDFResponse(pdfBytes, filename);
}
