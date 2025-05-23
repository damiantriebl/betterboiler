import { PDFBuilder, colors, fontSizes, margins } from '@/lib/pdf-lib-utils';
import type { CurrentAccountForReport } from '@/actions/current-accounts/get-current-account-for-report';

export async function generateCurrentAccountPDF(account: CurrentAccountForReport): Promise<Uint8Array> {
  const pdf = await PDFBuilder.create();
  const { width, height } = pdf.getPageDimensions();
  
  let currentY = height - margins.normal;
  const contentWidth = width - (margins.normal * 2);

  // Título principal
  pdf.addCenteredTitle('Reporte de Cuenta Corriente', currentY);
  currentY -= 50;

  // Información del cliente
  currentY = pdf.addSection('Información del Cliente', margins.normal, currentY, contentWidth);
  
  const clientInfo = [
    `Nombre: ${account.client.firstName} ${account.client.lastName || ''}`,
    `ID Fiscal: ${account.client.taxId || 'N/A'}`,
    `Email: ${account.client.email || 'N/A'}`,
    `Teléfono: ${account.client.phone || account.client.mobile || 'N/A'}`,
    `Dirección: ${account.client.address || 'N/A'}`,
  ];

  clientInfo.forEach((text) => {
    pdf.addText(text, { 
      x: margins.normal + 10, 
      y: currentY, 
      size: fontSizes.normal 
    });
    currentY -= 18;
  });

  currentY -= 20;

  // Información del vehículo
  if (account.motorcycle) {
    currentY = pdf.addSection('Información del Vehículo', margins.normal, currentY, contentWidth);
    
    const vehicleInfo = [
      `Marca: ${account.motorcycle.brand?.name || 'N/A'}`,
      `Modelo: ${account.motorcycle.model?.name || 'N/A'}`,
      `Año: ${account.motorcycle.year}`,
      `Chasis: ${account.motorcycle.chassisNumber}`,
      `Motor: ${account.motorcycle.engineNumber || 'N/A'}`,
      `Cilindrada: ${account.motorcycle.displacement ? `${account.motorcycle.displacement}cc` : 'N/A'}`,
    ];

    vehicleInfo.forEach((text) => {
      pdf.addText(text, { 
        x: margins.normal + 10, 
        y: currentY, 
        size: fontSizes.normal 
      });
      currentY -= 18;
    });

    currentY -= 20;
  }

  // Resumen financiero
  currentY = pdf.addSection('Resumen Financiero', margins.normal, currentY, contentWidth);
  
  const financialInfo = [
    `Monto Total: ${PDFBuilder.formatCurrency(account.totalAmount, account.currency || 'ARS')}`,
    `Entrega Inicial: ${PDFBuilder.formatCurrency(account.downPayment, account.currency || 'ARS')}`,
    `Saldo Restante: ${PDFBuilder.formatCurrency(account.remainingAmount, account.currency || 'ARS')}`,
    `Cantidad de Cuotas: ${account.numberOfInstallments}`,
    `Monto por Cuota: ${PDFBuilder.formatCurrency(account.installmentAmount, account.currency || 'ARS')}`,
    `Frecuencia: ${account.paymentFrequency}`,
    `Estado: ${account.status}`,
  ];

  financialInfo.forEach((text) => {
    pdf.addText(text, { 
      x: margins.normal + 10, 
      y: currentY, 
      size: fontSizes.normal 
    });
    currentY -= 18;
  });

  currentY -= 30;

  // Nueva página si es necesario
  if (currentY < 300) {
    pdf.addPage();
    currentY = height - margins.normal;
  }

  // Tabla de pagos
  if (account.payments && account.payments.length > 0) {
    currentY = pdf.addSection('Historial de Pagos', margins.normal, currentY, contentWidth);
    
    const paymentHeaders = ['Fecha', 'Cuota #', 'Monto', 'Estado', 'Método'];
    const paymentRows = account.payments.map((payment) => [
      payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('es-AR') : 'Pendiente',
      payment.installmentNumber?.toString() || '-',
      PDFBuilder.formatCurrency(payment.amountPaid, account.currency || 'ARS'),
      payment.status,
      payment.paymentMethod || 'N/A',
    ]);

    currentY = pdf.addTable({
      x: margins.normal,
      y: currentY,
      width: contentWidth,
      cellHeight: 22,
      headers: paymentHeaders,
      rows: paymentRows,
      fontSize: fontSizes.small,
    });

    currentY -= 20;
  }

  // Plan de pagos (próximas cuotas)
  if (currentY < 200) {
    pdf.addPage();
    currentY = height - margins.normal;
  }

  currentY = pdf.addSection('Plan de Pagos', margins.normal, currentY, contentWidth);
  
  // Generar plan de pagos futuro
  const startDate = new Date(account.startDate);
  const planRows: string[][] = [];
  
  for (let i = 1; i <= account.numberOfInstallments; i++) {
    const dueDate = new Date(startDate);
    
    // Calcular fecha de vencimiento basada en frecuencia
    switch (account.paymentFrequency) {
      case 'WEEKLY':
        dueDate.setDate(startDate.getDate() + (i - 1) * 7);
        break;
      case 'BIWEEKLY':
        dueDate.setDate(startDate.getDate() + (i - 1) * 14);
        break;
      case 'MONTHLY':
        dueDate.setMonth(startDate.getMonth() + (i - 1));
        break;
      case 'QUARTERLY':
        dueDate.setMonth(startDate.getMonth() + (i - 1) * 3);
        break;
      case 'ANNUALLY':
        dueDate.setFullYear(startDate.getFullYear() + (i - 1));
        break;
    }

    // Verificar si ya fue pagada
    const payment = account.payments?.find(p => p.installmentNumber === i);
    const status = payment ? payment.status : 'PENDING';
    const paidAmount = payment ? payment.amountPaid : 0;
    
    planRows.push([
      i.toString(),
      dueDate.toLocaleDateString('es-AR'),
      PDFBuilder.formatCurrency(account.installmentAmount, account.currency || 'ARS'),
      PDFBuilder.formatCurrency(paidAmount, account.currency || 'ARS'),
      status === 'COMPLETED' ? 'Pagada' : status === 'PENDING' ? 'Pendiente' : 'Parcial',
    ]);
  }

  const planHeaders = ['Cuota #', 'Vencimiento', 'Monto', 'Pagado', 'Estado'];
  
  pdf.addTable({
    x: margins.normal,
    y: currentY,
    width: contentWidth,
    cellHeight: 20,
    headers: planHeaders,
    rows: planRows,
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

  pdf.addText(`ID Cuenta: ${account.id}`, {
    x: width - margins.normal - 100,
    y: 30,
    size: fontSizes.small,
    color: colors.gray,
  });

  return pdf.finalize();
}

// Función para crear una respuesta HTTP con el PDF
export function createCurrentAccountPDFResponse(pdfBytes: Uint8Array, filename: string): Response {
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBytes.length.toString(),
    },
  });
} 