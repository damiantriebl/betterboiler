import { generateSalesReportPDF, createPDFResponse } from '@/lib/pdf-generators/sales-report-pdf';
import type { SalesReport } from '@/types/reports';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // En un caso real, obtendrías los datos del reporte desde la base de datos
    // Aquí usamos datos de ejemplo
    const reportData: SalesReport = await request.json();

    // Generar el PDF usando pdf-lib
    const pdfBytes = await generateSalesReportPDF(reportData);

    // Crear y retornar la respuesta HTTP
    return createPDFResponse(pdfBytes, `reporte-ventas-${new Date().toISOString().split('T')[0]}.pdf`);

  } catch (error) {
    console.error('Error generando PDF de ventas:', error);
    return new Response(
      JSON.stringify({ error: 'Error generando el reporte PDF' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Ejemplo para generar un reporte con datos mock
export async function GET() {
  try {
    // Datos de ejemplo para demostración
    const mockReport: SalesReport = {
      summary: {
        totalSales: 15,
        totalRevenue: { ARS: 2500000, USD: 5000 },
        totalProfit: { ARS: 750000, USD: 1500 },
        averagePrice: { ARS: 166667, USD: 333 },
      },
      salesBySeller: {
        '1': {
          name: 'Juan Pérez',
          count: 8,
          revenue: { ARS: 1200000, USD: 2400 },
          profit: { ARS: 360000, USD: 720 },
        },
        '2': {
          name: 'María García',
          count: 7,
          revenue: { ARS: 1300000, USD: 2600 },
          profit: { ARS: 390000, USD: 780 },
        },
      },
      salesByBranch: {
        '1': {
          name: 'Sucursal Centro',
          count: 10,
          revenue: { ARS: 1600000, USD: 3200 },
        },
        '2': {
          name: 'Sucursal Norte',
          count: 5,
          revenue: { ARS: 900000, USD: 1800 },
        },
      },
      salesByMonth: {
        'Enero 2024': {
          count: 5,
          revenue: { ARS: 800000, USD: 1600 },
        },
        'Febrero 2024': {
          count: 10,
          revenue: { ARS: 1700000, USD: 3400 },
        },
      },
    };

    const pdfBytes = await generateSalesReportPDF(mockReport);
    return createPDFResponse(pdfBytes, 'reporte-ventas-ejemplo.pdf');

  } catch (error) {
    console.error('Error generando PDF de ejemplo:', error);
    return new Response(
      JSON.stringify({ error: 'Error generando el reporte de ejemplo' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 