import { PDFBuilder, colors, fontSizes, margins } from '@/lib/pdf-lib-utils';
import type {
  ReportDataForPdf,
} from '@/types/PettyCashActivity';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function generatePettyCashActivityPDF(
  data: ReportDataForPdf[],
  fromDate: Date,
  toDate: Date
): Promise<Uint8Array> {
  const pdf = await PDFBuilder.create();
  const { width, height } = pdf.getPageDimensions();
  
  let currentY = height - margins.normal;
  const contentWidth = width - (margins.normal * 2);

  const formatDate = (date: Date | string | null | undefined) =>
    date ? format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: es }) : 'N/A';
  const formatDateShort = (date: Date | string | null | undefined) =>
    date ? format(new Date(date), 'dd/MM/yyyy', { locale: es }) : 'N/A';
  const formatCurrency = (amount: number | null | undefined) => {
    return PDFBuilder.formatCurrency(amount || 0, 'ARS');
  };

  // Título principal
  pdf.addCenteredTitle('Reporte de Actividad de Caja Chica', currentY);
  currentY -= 30;

  // Subtítulo con período
  const periodText = `Período: ${formatDateShort(fromDate)} al ${formatDateShort(toDate)}`;
  pdf.addCenteredTitle(periodText, currentY, fontSizes.medium);
  currentY -= 60;

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

  if (data.length === 0) {
    pdf.addText('No se encontraron datos de actividad de caja chica para el período y sucursal seleccionados.', {
      x: margins.normal + 10,
      y: currentY,
      size: fontSizes.normal,
    });
  } else {
    // Procesar cada depósito
    for (const deposit of data) {
      if (currentY < 200) {
        pdf.addPage();
        currentY = height - margins.normal;
      }

      // Sección del depósito
      currentY = pdf.addSection(
        `Depósito - ${formatDate(deposit.date)} - Sucursal: ${deposit.branch?.name || 'Cuenta General'} - Monto: ${formatCurrency(deposit.amount)}`,
        margins.normal,
        currentY,
        contentWidth
      );

      // Detalles del depósito
      const depositInfo = [
        `Referencia: ${deposit.reference || '-'}`,
        `Descripción: ${deposit.description}`,
      ];

      depositInfo.forEach((text) => {
        pdf.addText(text, {
          x: margins.normal + 15,
          y: currentY,
          size: fontSizes.small,
        });
        currentY -= 15;
      });

      currentY -= 10;

      // Procesar retiros
      if (deposit.withdrawals.length > 0) {
        for (const withdrawal of deposit.withdrawals) {
          if (currentY < 150) {
            pdf.addPage();
            currentY = height - margins.normal;
          }

          // Sección del retiro
          pdf.addText(
            `Retiro - ${formatDate(withdrawal.date)} - Usuario: ${withdrawal.userName} - Monto Entregado: ${formatCurrency(withdrawal.amountGiven)}`,
            {
              x: margins.normal + 20,
              y: currentY,
              size: fontSizes.small,
            }
          );
          currentY -= 15;

          const withdrawalInfo = [
            `Justificado: ${formatCurrency(withdrawal.amountJustified)}`,
            `Estado: ${withdrawal.status}`,
          ];

          withdrawalInfo.forEach((text) => {
            pdf.addText(text, {
              x: margins.normal + 25,
              y: currentY,
              size: fontSizes.small,
            });
            currentY -= 12;
          });

          // Tabla de gastos
          if (withdrawal.spends.length > 0) {
            currentY -= 10;
            pdf.addText('Gastos Asociados:', {
              x: margins.normal + 25,
              y: currentY,
              size: fontSizes.small,
            });
            currentY -= 15;

            const spendsHeaders = ['Fecha', 'Motivo', 'Descripción', 'Monto'];
            const spendsRows = withdrawal.spends.map((spend) => [
              formatDateShort(spend.date),
              spend.motive || '-',
              spend.description,
              formatCurrency(spend.amount),
            ]);

            currentY = pdf.addTable({
              x: margins.normal + 20,
              y: currentY,
              width: contentWidth - 20,
              cellHeight: 18,
              headers: spendsHeaders,
              rows: spendsRows,
              fontSize: fontSizes.small,
            });
          } else {
            pdf.addText('Sin gastos registrados para este retiro.', {
              x: margins.normal + 25,
              y: currentY,
              size: fontSizes.small,
            });
            currentY -= 15;
          }

          currentY -= 15;
        }
      } else {
        pdf.addText('Sin retiros registrados para este depósito.', {
          x: margins.normal + 15,
          y: currentY,
          size: fontSizes.small,
        });
        currentY -= 15;
      }

      currentY -= 20;
    }
  }

  // Resumen del período
  if (currentY < 120) {
    pdf.addPage();
    currentY = height - margins.normal;
  }

  currentY = pdf.addSection('Resumen del Período', margins.normal, currentY, contentWidth);

  const summaryInfo = [
    `Total Depósitos: ${formatCurrency(totalDeposits)}`,
    `Total Retiros (Entregado): ${formatCurrency(totalWithdrawals)}`,
    `Total Gastos Registrados: ${formatCurrency(totalSpends)}`,
  ];

  summaryInfo.forEach((text) => {
    pdf.addText(text, {
      x: margins.normal + 10,
      y: currentY,
      size: fontSizes.normal,
    });
    currentY -= 18;
  });

  // Pie de página
  const now = new Date().toLocaleDateString('es-AR');
  pdf.addText(`Generado el: ${now}`, {
    x: margins.normal,
    y: 30,
    size: fontSizes.small,
    color: colors.gray,
  });

  return pdf.finalize();
}

// Función para crear una respuesta HTTP con el PDF
export function createPettyCashActivityPDFResponse(pdfBytes: Uint8Array, filename: string): Response {
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBytes.length.toString(),
    },
  });
} 