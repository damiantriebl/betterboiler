import { PDFBuilder, colors, fontSizes, margins } from '@/lib/pdf-lib-utils';
import type { InventoryStatusReport } from '@/types/reports';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function generateInventoryReportPDF(
  data: InventoryStatusReport,
  dateRange?: { from?: Date; to?: Date }
): Promise<Uint8Array> {
  const pdf = await PDFBuilder.create();
  const { width, height } = pdf.getPageDimensions();
  
  let currentY = height - margins.normal;
  const contentWidth = width - (margins.normal * 2);

  // Título principal
  pdf.addCenteredTitle('Reporte de Inventario', currentY);
  currentY -= 40;

  // Subtítulo con rango de fechas
  if (dateRange) {
    const dateText = `Período: ${dateRange.from ? format(dateRange.from, 'dd/MM/yyyy', { locale: es }) : 'N/A'} - ${dateRange.to ? format(dateRange.to, 'dd/MM/yyyy', { locale: es }) : 'N/A'}`;
    pdf.addCenteredTitle(dateText, currentY, fontSizes.medium);
    currentY -= 50;
  } else {
    currentY -= 30;
  }

  // Sección Resumen
  currentY = pdf.addSection('Resumen', margins.normal, currentY, contentWidth);
  
  const summaryHeaders = ['Concepto', 'Cantidad'];
  const summaryRows = [
    ['Total', data.summary.total.toString()],
    ['En Stock', data.summary.inStock.toString()],
    ['Reservadas', data.summary.reserved.toString()],
    ['Vendidas', data.summary.sold.toString()],
  ];

  currentY = pdf.addTable({
    x: margins.normal,
    y: currentY,
    width: contentWidth,
    cellHeight: 25,
    headers: summaryHeaders,
    rows: summaryRows,
    fontSize: fontSizes.normal,
  });

  currentY -= 40;

  // Sección Por Estado
  currentY = pdf.addSection('Por Estado', margins.normal, currentY, contentWidth);
  
  const stateHeaders = ['Estado', 'Cantidad'];
  const stateRows = data.byState.map((item) => [
    item.state,
    item._count.toString(),
  ]);

  currentY = pdf.addTable({
    x: margins.normal,
    y: currentY,
    width: contentWidth,
    cellHeight: 22,
    headers: stateHeaders,
    rows: stateRows,
    fontSize: fontSizes.normal,
  });

  currentY -= 40;

  // Sección Por Marca
  if (currentY < 200) {
    pdf.addPage();
    currentY = height - margins.normal;
  }

  currentY = pdf.addSection('Por Marca', margins.normal, currentY, contentWidth);
  
  const brandHeaders = ['Marca', 'Cantidad'];
  const brandRows = data.byBrand.map((item) => [
    item.brandName,
    item._count.toString(),
  ]);

  currentY = pdf.addTable({
    x: margins.normal,
    y: currentY,
    width: contentWidth,
    cellHeight: 22,
    headers: brandHeaders,
    rows: brandRows,
    fontSize: fontSizes.normal,
  });

  currentY -= 40;

  // Sección Valor por Estado
  if (currentY < 200) {
    pdf.addPage();
    currentY = height - margins.normal;
  }

  currentY = pdf.addSection('Valor por Estado', margins.normal, currentY, contentWidth);
  
  const valueHeaders = ['Estado', 'Moneda', 'Valor de Venta', 'Costo'];
  const valueRows = data.valueByState.map((item) => [
    item.state,
    item.currency,
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: item.currency,
    }).format(item._sum.retailPrice || 0),
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: item.currency,
    }).format(item._sum.costPrice || 0),
  ]);

  pdf.addTable({
    x: margins.normal,
    y: currentY,
    width: contentWidth,
    cellHeight: 22,
    headers: valueHeaders,
    rows: valueRows,
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
export function createInventoryReportPDFResponse(pdfBytes: Uint8Array, filename: string = 'reporte-inventario.pdf'): Response {
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBytes.length.toString(),
    },
  });
} 