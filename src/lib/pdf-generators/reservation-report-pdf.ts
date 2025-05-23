import { PDFBuilder, colors, fontSizes, margins } from '@/lib/pdf-lib-utils';
import type { ReservationsReport } from '@/types/reports';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function generateReservationReportPDF(report: ReservationsReport): Promise<Uint8Array> {
  const pdf = await PDFBuilder.create();
  const { width, height } = pdf.getPageDimensions();
  
  let currentY = height - margins.normal;
  const contentWidth = width - (margins.normal * 2);

  // Título principal
  pdf.addCenteredTitle('Reporte de Reservas', currentY);
  currentY -= 30;

  // Subtítulo con fecha
  const dateText = `Generado el ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}`;
  pdf.addCenteredTitle(dateText, currentY, fontSizes.medium);
  currentY -= 60;

  // Resumen General
  currentY = pdf.addSection('Resumen General', margins.normal, currentY, contentWidth);
  
  const summaryInfo = [
    `Total de Reservas: ${report.summary.totalReservations}`,
    `Reservas Activas: ${report.summary.activeReservations}`,
    `Reservas Completadas: ${report.summary.completedReservations}`,
    `Tasa de Conversión: ${report.summary.conversionRate.toFixed(2)}%`,
  ];

  summaryInfo.forEach((text) => {
    pdf.addText(text, {
      x: margins.normal + 10,
      y: currentY,
      size: fontSizes.normal,
    });
    currentY -= 18;
  });

  currentY -= 30;

  // Montos Totales por Moneda
  currentY = pdf.addSection('Montos Totales por Moneda', margins.normal, currentY, contentWidth);
  
  const currencyHeaders = ['Moneda', 'Monto Total'];
  const currencyRows = Object.entries(report.summary.totalAmount).map(([currency, amount]) => [
    currency,
    PDFBuilder.formatCurrency(amount, currency),
  ]);

  currentY = pdf.addTable({
    x: margins.normal,
    y: currentY,
    width: contentWidth,
    cellHeight: 22,
    headers: currencyHeaders,
    rows: currencyRows,
    fontSize: fontSizes.normal,
  });

  currentY -= 40;

  // Reservas por Estado
  if (currentY < 300) {
    pdf.addPage();
    currentY = height - margins.normal;
  }

  currentY = pdf.addSection('Reservas por Estado', margins.normal, currentY, contentWidth);
  
  const statusHeaders = ['Estado', 'Cantidad', 'Montos'];
  const statusRows: string[][] = [];

  Object.entries(report.reservationsByStatus).forEach(([status, info]) => {
    // Primera fila con el estado y cantidad
    statusRows.push([status, info.count.toString(), '']);
    
    // Filas adicionales con los montos por moneda
    Object.entries(info.amount).forEach(([currency, amount]) => {
      statusRows.push(['', '', `${currency}: ${PDFBuilder.formatCurrency(amount, currency)}`]);
    });
  });

  pdf.addTable({
    x: margins.normal,
    y: currentY,
    width: contentWidth,
    cellHeight: 20,
    headers: statusHeaders,
    rows: statusRows,
    fontSize: fontSizes.small,
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
export function createReservationReportPDFResponse(pdfBytes: Uint8Array, filename: string = 'reporte-reservas.pdf'): Response {
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBytes.length.toString(),
    },
  });
} 