import { PDFBuilder, colors, fontSizes, margins } from '@/lib/pdf-lib-utils';
import type { SalesReport } from '@/types/reports';

export async function generateSalesReportPDF(report: SalesReport): Promise<Uint8Array> {
  const pdf = await PDFBuilder.create();
  const { width, height } = pdf.getPageDimensions();
  
  let currentY = height - margins.normal;
  const contentWidth = width - (margins.normal * 2);

  const currencies = Object.keys(report.summary.totalRevenue);
  const mainCurrency = currencies[0] || 'USD';

  // Título principal
  pdf.addCenteredTitle('Reporte de Ventas', currentY);
  currentY -= 30;

  // Subtítulo
  const subtitleText = `Total de Ventas: ${report.summary.totalSales}`;
  pdf.addCenteredTitle(subtitleText, currentY, fontSizes.medium);
  currentY -= 60;

  // Sección Resumen
  currentY = pdf.addSection('Resumen', margins.normal, currentY, contentWidth);
  
  const summaryInfo = [
    `Ventas Totales: ${report.summary.totalSales}`,
    `Ingresos Totales: ${PDFBuilder.formatCurrency(report.summary.totalRevenue[mainCurrency] || 0, mainCurrency)}`,
    `Ganancia Total: ${PDFBuilder.formatCurrency(report.summary.totalProfit[mainCurrency] || 0, mainCurrency)}`,
    `Precio Promedio: ${PDFBuilder.formatCurrency(report.summary.averagePrice[mainCurrency] || 0, mainCurrency)}`,
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

  // Ventas por Vendedor
  currentY = pdf.addSection('Ventas por Vendedor', margins.normal, currentY, contentWidth);
  
  const sellerHeaders = ['Vendedor', 'Cantidad', 'Ingresos', 'Ganancia'];
  const sellerRows = Object.entries(report.salesBySeller).map(([id, seller]) => [
    seller.name,
    seller.count.toString(),
    PDFBuilder.formatCurrency(seller.revenue[mainCurrency] || 0, mainCurrency),
    PDFBuilder.formatCurrency(seller.profit[mainCurrency] || 0, mainCurrency),
  ]);

  currentY = pdf.addTable({
    x: margins.normal,
    y: currentY,
    width: contentWidth,
    cellHeight: 20,
    headers: sellerHeaders,
    rows: sellerRows,
    fontSize: fontSizes.small,
  });

  currentY -= 40;

  // Ventas por Sucursal
  if (currentY < 250) {
    pdf.addPage();
    currentY = height - margins.normal;
  }

  currentY = pdf.addSection('Ventas por Sucursal', margins.normal, currentY, contentWidth);
  
  const branchHeaders = ['Sucursal', 'Cantidad', 'Ingresos'];
  const branchRows = Object.entries(report.salesByBranch).map(([id, branch]) => [
    branch.name,
    branch.count.toString(),
    PDFBuilder.formatCurrency(branch.revenue[mainCurrency] || 0, mainCurrency),
  ]);

  currentY = pdf.addTable({
    x: margins.normal,
    y: currentY,
    width: contentWidth,
    cellHeight: 20,
    headers: branchHeaders,
    rows: branchRows,
    fontSize: fontSizes.small,
  });

  currentY -= 40;

  // Ventas por Mes
  if (currentY < 250) {
    pdf.addPage();
    currentY = height - margins.normal;
  }

  currentY = pdf.addSection('Ventas por Mes', margins.normal, currentY, contentWidth);
  
  const monthHeaders = ['Mes', 'Cantidad', 'Ingresos'];
  const monthRows = Object.entries(report.salesByMonth).map(([month, data]) => [
    month,
    data.count.toString(),
    PDFBuilder.formatCurrency(data.revenue[mainCurrency] || 0, mainCurrency),
  ]);

  pdf.addTable({
    x: margins.normal,
    y: currentY,
    width: contentWidth,
    cellHeight: 20,
    headers: monthHeaders,
    rows: monthRows,
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
export function createPDFResponse(pdfBytes: Uint8Array, filename: string = 'reporte-ventas.pdf'): Response {
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBytes.length.toString(),
    },
  });
} 