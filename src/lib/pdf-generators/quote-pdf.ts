import { PDFBuilder, colors, fontSizes, margins } from '@/lib/pdf-lib-utils';
import type { AmortizationScheduleEntry, QuotePDFProps as BaseQuotePDFProps } from '@/types/quote';

export interface QuotePDFProps extends BaseQuotePDFProps {
  motorcycleImage?: string;
  organizationName?: string;
  userName?: string;
  userImage?: string;
  organizationLogo?: string;
}

export async function generateQuotePDF(props: QuotePDFProps): Promise<Uint8Array> {
  const {
    motorcycle,
    paymentData,
    activeTab,
    basePrice,
    modifierAmount,
    finalPrice,
    financedAmount,
    installmentDetails,
    totalWithFinancing,
    organizationName,
    userName,
  } = props;

  if (!motorcycle) {
    throw new Error('Datos de motocicleta requeridos');
  }

  const pdf = await PDFBuilder.create();
  const { width, height } = pdf.getPageDimensions();
  
  let currentY = height - margins.normal;
  const contentWidth = width - (margins.normal * 2);

  // Encabezado
  pdf.addText(`Presupuesto ${organizationName || 'Empresa'}`, {
    x: margins.normal,
    y: currentY,
    size: fontSizes.title,
    font: await pdf['timesRomanBoldFont'],
  });

  const currentDate = new Date().toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  pdf.addText(`Fecha: ${currentDate}`, {
    x: margins.normal,
    y: currentY - 25,
    size: fontSizes.normal,
  });

  currentY -= 80;

  // Información del vehículo
  currentY = pdf.addSection('Información del Vehículo', margins.normal, currentY, contentWidth);
  
  const vehicleInfo = [
    `Marca/Modelo: ${motorcycle.brand?.name} ${motorcycle.model?.name}`,
    `Año: ${motorcycle.year}`,
    `Color: ${motorcycle.color?.name || 'N/A'}`,
    `Chasis: ${motorcycle.chassisNumber || 'N/A'}`,
    `Motor: ${motorcycle.engineNumber || 'N/A'}`,
    `Kilometraje: ${motorcycle.mileage} km`,
    `Cilindrada: ${motorcycle.displacement || 'N/A'} cc`,
  ];

  vehicleInfo.forEach((text) => {
    pdf.addText(text, {
      x: margins.normal + 10,
      y: currentY,
      size: fontSizes.normal,
    });
    currentY -= 18;
  });

  currentY -= 30;

  // Información de pago
  currentY = pdf.addSection('Información de Pago', margins.normal, currentY, contentWidth);

  const getPaymentMethodText = () => {
    switch (activeTab) {
      case 'efectivo':
        return 'Efectivo/Transferencia';
      case 'tarjeta':
        return `Tarjeta - ${paymentData.cuotas} cuota(s)`;
      case 'cuenta_corriente':
        return `Financiación - ${paymentData.currentAccountInstallments} cuotas (${paymentData.annualInterestRate}% interés)`;
      default:
        return 'No especificado';
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: motorcycle?.currency || 'ARS',
    }).format(amount);
  };

  const paymentInfo = [
    `Método de Pago: ${getPaymentMethodText()}`,
    `Precio Base: ${formatAmount(basePrice)}`,
  ];

  if (paymentData.discountValue > 0) {
    paymentInfo.push(
      `${paymentData.discountType === 'discount' ? 'Descuento' : 'Recargo'} (${paymentData.discountValue}%): ${paymentData.discountType === 'discount' ? '-' : '+'}${formatAmount(modifierAmount)}`
    );
  }

  paymentInfo.push(`Precio Final: ${formatAmount(finalPrice)}`);

  if (activeTab === 'tarjeta' && paymentData.cuotas > 1) {
    paymentInfo.push(
      `Cuotas: ${paymentData.cuotas}`,
      `Valor de Cuota: ${formatAmount(finalPrice / paymentData.cuotas)}`
    );
  }

  if (activeTab === 'cuenta_corriente') {
    paymentInfo.push(
      `Pago Inicial: ${formatAmount(paymentData.downPayment)}`,
      `Monto a Financiar: ${formatAmount(financedAmount)}`,
      `Tasa de Interés: ${paymentData.annualInterestRate}% anual`,
      `Cuotas: ${paymentData.currentAccountInstallments} (${paymentData.currentAccountFrequency})`,
      `Valor de Cuota: ${formatAmount(installmentDetails.installmentAmount)}`,
      `Total a Pagar: ${formatAmount(totalWithFinancing)}`
    );

    if ('totalInterest' in installmentDetails && installmentDetails.totalInterest !== undefined && installmentDetails.totalInterest > 0) {
      paymentInfo.push(`Intereses Totales: ${formatAmount(installmentDetails.totalInterest)}`);
    }
  }

  paymentInfo.forEach((text) => {
    pdf.addText(text, {
      x: margins.normal + 10,
      y: currentY,
      size: fontSizes.normal,
    });
    currentY -= 18;
  });

  currentY -= 30;

  // Plan de pagos para cuenta corriente
  if (activeTab === 'cuenta_corriente' && installmentDetails.schedule && installmentDetails.schedule.length > 0) {
    if (currentY < 300) {
      pdf.addPage();
      currentY = height - margins.normal;
    }

    currentY = pdf.addSection('Plan de Pagos', margins.normal, currentY, contentWidth);

    const scheduleHeaders = ['N°', 'Capital', 'Amort.', 'Interés', 'Cuota'];
    const scheduleRows = installmentDetails.schedule.map((item: AmortizationScheduleEntry) => [
      item.installmentNumber.toString(),
      formatAmount(item.capitalAtPeriodStart),
      formatAmount(item.amortization),
      formatAmount(item.interestForPeriod),
      formatAmount(item.calculatedInstallmentAmount),
    ]);

    currentY = pdf.addTable({
      x: margins.normal,
      y: currentY,
      width: contentWidth,
      cellHeight: 20,
      headers: scheduleHeaders,
      rows: scheduleRows,
      fontSize: fontSizes.small,
    });

    currentY -= 30;
  }

  // Información del usuario
  if (userName) {
    pdf.addText(`Presupuesto generado por: ${userName}`, {
      x: margins.normal,
      y: currentY,
      size: fontSizes.normal,
    });
    currentY -= 30;
  }

  // Pie de página
  pdf.addText('Este presupuesto es válido por 7 días desde la fecha de emisión.', {
    x: margins.normal,
    y: 50,
    size: fontSizes.small,
    color: colors.gray,
  });

  pdf.addText('Todos los precios incluyen IVA.', {
    x: margins.normal,
    y: 35,
    size: fontSizes.small,
    color: colors.gray,
  });

  return pdf.finalize();
}

// Función para crear una respuesta HTTP con el PDF
export function createQuotePDFResponse(pdfBytes: Uint8Array, filename: string = 'Presupuesto.pdf'): Response {
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBytes.length.toString(),
    },
  });
} 