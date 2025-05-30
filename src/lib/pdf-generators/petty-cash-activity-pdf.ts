import { PDFBuilder, colors, fontSizes, margins } from "@/lib/pdf-lib-utils";
import type { ReportDataForPdf } from "@/types/PettyCashActivity";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { type PDFSection, PDFSectionHelpers, PDFTemplate, createPDFResponse } from "./pdf-template";

// Función para traducir estados al español
const translateStatus = (status: string): string => {
  const translations: Record<string, string> = {
    JUSTIFIED: "Justificado",
    PARTIALLY_JUSTIFIED: "Parcialmente Justificado",
    NOT_JUSTIFIED: "No Justificado",
    PENDING: "Pendiente",
    PARTIAL: "Parcial",
    REJECTED: "Rechazado",
  };
  return translations[status] || status;
};

export async function generatePettyCashActivityPDF(
  data: ReportDataForPdf[],
  fromDate: Date,
  toDate: Date,
): Promise<Uint8Array> {
  // Crear template con la plantilla base
  const template = new PDFTemplate({
    title: "Reporte Caja Chica",
    subtitle: "Movimientos de Depósitos y Retiros",
    dateRange: { from: fromDate, to: toDate },
    filename: "reporte-caja-chica.pdf",
  });

  await template.init();

  const formatDate = (date: Date | string | null | undefined) =>
    date ? format(new Date(date), "dd/MM/yyyy HH:mm", { locale: es }) : "N/A";
  const formatDateShort = (date: Date | string | null | undefined) =>
    date ? format(new Date(date), "dd/MM/yyyy", { locale: es }) : "N/A";
  const formatCurrency = (amount: number | null | undefined) => {
    return PDFBuilder.formatCurrency(amount || 0, "ARS");
  };

  // Calcular totales
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let totalSpends = 0;

  for (const deposit of data) {
    totalDeposits += deposit.amount;
    for (const withdrawal of deposit.withdrawals) {
      totalWithdrawals += withdrawal.amountGiven;
      for (const spend of withdrawal.spends) {
        totalSpends += spend.amount;
      }
    }
  }

  // Verificar si hay datos
  const hasData = data.length > 0;

  // Definir secciones del reporte
  const sections: PDFSection[] = [
    // Sección Resumen General
    {
      title: "Resumen del Período",
      content: hasData
        ? PDFSectionHelpers.createSummarySection({
            "Total Depósitos": formatCurrency(totalDeposits),
            "Total Retiros (Entregado)": formatCurrency(totalWithdrawals),
            "Total Gastos Registrados": formatCurrency(totalSpends),
            "Diferencia (Depósitos - Gastos)": formatCurrency(totalDeposits - totalSpends),
          })
        : PDFSectionHelpers.createTextSection(
            "No se encontraron datos de actividad de caja chica para el período y sucursal seleccionados.",
            {
              fontSize: fontSizes.medium,
              centered: true,
              color: colors.textSecondary,
            },
          ),
    },

    // Sección de Detalle de Movimientos (solo si hay datos)
    ...(hasData
      ? [
          {
            title: "Detalle de Movimientos",
            content: (pdf: PDFBuilder, currentY: number, contentWidth: number): number => {
              let yPosition = currentY;
              // Procesar cada depósito
              for (const deposit of data) {
                if (yPosition < 200) {
                  pdf.addPage();
                  yPosition = pdf.getPageDimensions().height - margins.normal;
                }

                // Header del depósito con formato mejorado
                const depositHeader = `Sucursal: ${deposit.branch?.name || "Cuenta General"} - ${formatCurrency(deposit.amount)}`;
                const depositSubheader = `Depósito • ${formatDateShort(deposit.date)}`;

                // Título principal del depósito
                pdf.addText(depositHeader, {
                  x: margins.normal,
                  y: yPosition,
                  size: fontSizes.large,
                  color: colors.primary,
                });
                yPosition -= 20;

                // Subtítulo con fecha y tipo
                pdf.addText(depositSubheader, {
                  x: margins.normal,
                  y: yPosition,
                  size: fontSizes.small,
                  color: colors.textMuted,
                });
                yPosition -= 25;

                // Detalles del depósito con mejor formato en líneas separadas
                if (deposit.reference) {
                  pdf.addText(`• Referencia: ${deposit.reference}`, {
                    x: margins.normal + 15,
                    y: yPosition,
                    size: fontSizes.small,
                    color: colors.textSecondary,
                  });
                  yPosition -= 15;
                }

                pdf.addText(`• Descripción: ${deposit.description}`, {
                  x: margins.normal + 15,
                  y: yPosition,
                  size: fontSizes.small,
                  color: colors.textSecondary,
                });
                yPosition -= 30;

                // Procesar retiros con mejor estructura
                if (deposit.withdrawals.length > 0) {
                  for (const withdrawal of deposit.withdrawals) {
                    if (yPosition < 150) {
                      pdf.addPage();
                      yPosition = pdf.getPageDimensions().height - margins.normal;
                    }

                    // Banda visual para el retiro (similar a "Detalle de Movimientos")
                    yPosition = pdf.addSection(
                      `Retiro - Usuario: ${withdrawal.userName} - ${formatCurrency(withdrawal.amountGiven)}`,
                      margins.normal + 20,
                      yPosition,
                      contentWidth - 40,
                    );

                    // Información del retiro en líneas separadas
                    const withdrawalInfo = [
                      `• Fecha: ${formatDateShort(withdrawal.date)}`,
                      `• Estado: ${translateStatus(withdrawal.status)}`,
                      `• Monto Justificado: ${formatCurrency(withdrawal.amountJustified)}`,
                    ];

                    for (const info of withdrawalInfo) {
                      pdf.addText(info, {
                        x: margins.normal + 20,
                        y: yPosition,
                        size: fontSizes.small,
                        color: colors.textSecondary,
                      });
                      yPosition -= 15;
                    }

                    yPosition -= 10;

                    // Tabla de gastos con mejor formato
                    if (withdrawal.spends.length > 0) {
                      pdf.addText("Gastos Registrados:", {
                        x: margins.normal + 25,
                        y: yPosition,
                        size: fontSizes.small,
                        color: colors.textPrimary,
                      });
                      yPosition -= 15;

                      const spendsHeaders = ["Fecha", "Motivo", "Descripción", "Monto"];
                      const spendsRows = withdrawal.spends.map((spend) => [
                        formatDateShort(spend.date),
                        spend.motive || "-",
                        spend.description,
                        formatCurrency(spend.amount),
                      ]);

                      yPosition = pdf.addTable({
                        x: margins.normal + 20,
                        y: yPosition,
                        width: contentWidth - 40,
                        cellHeight: 20,
                        headers: spendsHeaders,
                        rows: spendsRows,
                        fontSize: fontSizes.xs,
                        headerColor: colors.backgroundLight,
                        textColor: colors.textPrimary,
                        borderColor: colors.borderLight,
                      });
                    } else {
                      pdf.addText("Sin gastos registrados para este retiro.", {
                        x: margins.normal + 25,
                        y: yPosition,
                        size: fontSizes.small,
                        color: colors.textMuted,
                      });
                      yPosition -= 15;
                    }

                    yPosition -= 20;
                  }
                } else {
                  pdf.addText("Sin retiros registrados para este depósito.", {
                    x: margins.normal + 15,
                    y: yPosition,
                    size: fontSizes.small,
                    color: colors.textMuted,
                  });
                  yPosition -= 15;
                }

                // Separador entre depósitos
                yPosition -= 15;
                pdf.addHorizontalLine(margins.normal, yPosition, contentWidth, 1);
                yPosition -= 25;
              }

              return yPosition;
            },
            minSpaceRequired: 300,
          },
        ]
      : []),
  ];

  // Renderizar todas las secciones
  await template.addSections(sections);

  // Finalizar y retornar el PDF
  return template.finalize();
}

// Función para crear una respuesta HTTP con el PDF
export function createPettyCashActivityPDFResponse(
  pdfBytes: Uint8Array,
  filename: string,
): Response {
  return createPDFResponse(pdfBytes, filename);
}
