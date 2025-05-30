import type { CurrentAccountsReport } from "@/actions/reports/get-current-accounts-report";
import { PDFBuilder, colors, fontSizes, margins } from "@/lib/pdf-lib-utils";
import type { DateRange } from "@/types/DateRange";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { type PDFSection, PDFSectionHelpers, PDFTemplate, createPDFResponse } from "./pdf-template";

// Función para traducir estados al español
const translateStatus = (status: string): string => {
  const translations: Record<string, string> = {
    ACTIVE: "Activa",
    PAID_OFF: "Pagada",
    OVERDUE: "Vencida",
    DEFAULTED: "En Mora",
    CANCELLED: "Cancelada",
  };
  return translations[status] || status;
};

// Función para traducir frecuencia de pago
const translatePaymentFrequency = (frequency: string): string => {
  const translations: Record<string, string> = {
    WEEKLY: "Semanal",
    BIWEEKLY: "Quincenal",
    MONTHLY: "Mensual",
    QUARTERLY: "Trimestral",
    ANNUALLY: "Anual",
  };
  return translations[frequency] || frequency;
};

export async function generateCurrentAccountsReportPDF(
  report: CurrentAccountsReport,
  dateRange?: DateRange,
): Promise<Uint8Array> {
  // Crear template con la plantilla base
  const template = new PDFTemplate({
    title: "Reporte Cuentas Corrientes",
    subtitle: "Resumen y Detalle de Financiaciones",
    dateRange: dateRange,
    filename: "reporte-cuentas-corrientes.pdf",
  });

  await template.init();

  const formatDate = (date: Date | string | null | undefined) =>
    date ? format(new Date(date), "dd/MM/yyyy", { locale: es }) : "N/A";
  const formatDateShort = (date: Date | string | null | undefined) =>
    date ? format(new Date(date), "dd/MM/yyyy", { locale: es }) : "N/A";
  const formatCurrency = (amount: number | null | undefined) => {
    return PDFBuilder.formatCurrency(amount || 0, "ARS");
  };
  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(Number(year), Number(month) - 1);
    return format(date, "MMM yyyy", { locale: es });
  };

  const { summary, accounts } = report;
  const hasData = accounts.length > 0;

  // Definir secciones del reporte
  const sections: PDFSection[] = [
    // Sección Resumen General
    {
      title: "Resumen General",
      content: hasData
        ? PDFSectionHelpers.createSummarySection({
            "Total Cuentas": summary.totalAccounts.toString(),
            "Total Financiado": formatCurrency(summary.totalFinancedAmount),
            "Total Pagado": formatCurrency(summary.totalPaidAmount),
            "Saldo Pendiente": formatCurrency(summary.totalPendingAmount),
          })
        : PDFSectionHelpers.createTextSection(
            "No se encontraron cuentas corrientes para los filtros seleccionados.",
            {
              fontSize: fontSizes.medium,
              centered: true,
              color: colors.textSecondary,
            },
          ),
    },

    // Sección Distribución por Estado
    ...(hasData && summary.accountsByStatus.length > 0
      ? [
          {
            title: "Distribución por Estado",
            content: (pdf: PDFBuilder, currentY: number, contentWidth: number): number => {
              const headers = ["Estado", "Cantidad", "Monto Total"];
              const rows = summary.accountsByStatus.map((statusData) => [
                translateStatus(statusData.status),
                statusData.count.toString(),
                formatCurrency(statusData.totalAmount),
              ]);

              return pdf.addTable({
                x: margins.normal,
                y: currentY,
                width: contentWidth,
                cellHeight: 25,
                headers,
                rows,
                fontSize: fontSizes.small,
                headerColor: colors.backgroundLight,
                textColor: colors.textPrimary,
              });
            },
          },
        ]
      : []),

    // Sección Distribución por Sucursal
    ...(hasData && summary.accountsByBranch.length > 0
      ? [
          {
            title: "Distribución por Sucursal",
            content: (pdf: PDFBuilder, currentY: number, contentWidth: number): number => {
              const headers = ["Sucursal", "Cantidad", "Monto Total"];
              const rows = summary.accountsByBranch.map((branchData) => [
                branchData.branchName,
                branchData.count.toString(),
                formatCurrency(branchData.totalAmount),
              ]);

              return pdf.addTable({
                x: margins.normal,
                y: currentY,
                width: contentWidth,
                cellHeight: 25,
                headers,
                rows,
                fontSize: fontSizes.small,
                headerColor: colors.backgroundLight,
                textColor: colors.textPrimary,
              });
            },
          },
        ]
      : []),

    // Sección Pagos por Mes (últimos 6 meses)
    ...(hasData && summary.paymentsByMonth.length > 0
      ? [
          {
            title: "Pagos por Mes (Últimos 6 Meses)",
            content: (pdf: PDFBuilder, currentY: number, contentWidth: number): number => {
              const headers = ["Mes", "Cantidad Pagos", "Monto Total"];
              const rows = summary.paymentsByMonth
                .slice(-6)
                .map((monthData) => [
                  formatMonth(monthData.month),
                  monthData.totalPayments.toString(),
                  formatCurrency(monthData.totalAmount),
                ]);

              return pdf.addTable({
                x: margins.normal,
                y: currentY,
                width: contentWidth,
                cellHeight: 25,
                headers,
                rows,
                fontSize: fontSizes.small,
                headerColor: colors.backgroundLight,
                textColor: colors.textPrimary,
              });
            },
          },
        ]
      : []),

    // Sección Detalle de Cuentas
    ...(hasData
      ? [
          {
            title: "Detalle de Cuentas Corrientes",
            content: (pdf: PDFBuilder, currentY: number, contentWidth: number): number => {
              let yPosition = currentY;
              // Procesar cada cuenta
              for (const account of accounts) {
                if (yPosition < 250) {
                  pdf.addPage();
                  yPosition = pdf.getPageDimensions().height - margins.normal;
                }

                // Header de la cuenta con formato mejorado
                const accountHeader = `${account.client.firstName} ${account.client.lastName} - ${formatCurrency(account.totalAmount)}`;
                const accountSubheader = `Cuenta Corriente • ${formatDateShort(account.createdAt)}`;

                // Título principal de la cuenta
                pdf.addText(accountHeader, {
                  x: margins.normal,
                  y: yPosition,
                  size: fontSizes.large,
                  color: colors.primary,
                });
                yPosition -= 20;

                // Subtítulo con detalles
                pdf.addText(accountSubheader, {
                  x: margins.normal,
                  y: yPosition,
                  size: fontSizes.small,
                  color: colors.textMuted,
                });
                yPosition -= 25;

                // Información de la cuenta
                const accountInfo = [
                  `• Estado: ${translateStatus(account.status)}`,
                  `• Cuotas: ${account.numberOfInstallments}`,
                  `• Frecuencia: ${account.paymentFrequency}`,
                  `• Monto por cuota: ${formatCurrency(account.installmentAmount)}`,
                ];

                for (const info of accountInfo) {
                  pdf.addText(info, {
                    x: margins.normal + 15,
                    y: yPosition,
                    size: fontSizes.small,
                    color: colors.textSecondary,
                  });
                  yPosition -= 15;
                }

                yPosition -= 10;

                // Últimos pagos
                if (account.payments && account.payments.length > 0) {
                  pdf.addText("Últimos Pagos:", {
                    x: margins.normal + 15,
                    y: yPosition,
                    size: fontSizes.small,
                    color: colors.textPrimary,
                  });
                  yPosition -= 15;

                  const paymentsHeaders = ["Cuota", "Fecha", "Método", "Monto"];
                  const paymentsRows = account.payments
                    .slice(-5)
                    .map((payment) => [
                      `#${payment.installmentNumber}`,
                      formatDateShort(payment.paymentDate || payment.createdAt),
                      payment.paymentMethod || "N/A",
                      formatCurrency(payment.amountPaid),
                    ]);

                  yPosition = pdf.addTable({
                    x: margins.normal + 10,
                    y: yPosition,
                    width: contentWidth - 20,
                    cellHeight: 20,
                    headers: paymentsHeaders,
                    rows: paymentsRows,
                    fontSize: fontSizes.xs,
                    headerColor: colors.backgroundLight,
                    textColor: colors.textPrimary,
                    borderColor: colors.borderLight,
                  });
                }

                yPosition -= 30; // Espacio entre cuentas
              }

              return yPosition;
            },
          },
        ]
      : []),
  ];

  // Generar el PDF con todas las secciones
  await template.addSections(sections);
  return template.finalize();
}

export function createCurrentAccountsReportPDFResponse(
  pdfBytes: Uint8Array,
  filename: string,
): Response {
  return createPDFResponse(pdfBytes, filename);
}
