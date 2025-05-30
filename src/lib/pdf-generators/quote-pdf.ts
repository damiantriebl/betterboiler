import { colors, fontSizes, margins } from "@/lib/pdf-lib-utils";
import type { QuotePDFProps } from "@/types/quote";
import type { AmortizationScheduleEntry } from "@/types/quote";
import { type PDFSection, PDFSectionHelpers, PDFTemplate, createPDFResponse } from "./pdf-template";

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
    throw new Error("Datos de motocicleta requeridos");
  }

  // Crear template con el logo arriba del todo
  const template = new PDFTemplate({
    title: "Presupuesto de Motocicleta",
    subtitle: `${motorcycle.brand?.name} ${motorcycle.model?.name} (${motorcycle.year})`,
    filename: "presupuesto.pdf",
    includeGenerationDate: true,
  });

  await template.init();

  // Función para formatear montos
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: motorcycle?.currency || "ARS",
    }).format(amount);
  };

  // Función para obtener texto del método de pago
  const getPaymentMethodText = () => {
    switch (activeTab) {
      case "efectivo":
        return "Efectivo/Transferencia";
      case "tarjeta":
        return `Tarjeta - ${paymentData.cuotas} cuota(s)`;
      case "cuenta_corriente":
        return `Financiación - ${paymentData.currentAccountInstallments} cuotas (${paymentData.annualInterestRate}% interés)`;
      default:
        return "No especificado";
    }
  };

  // Definir secciones del presupuesto
  const sections: PDFSection[] = [
    // Sección Información del Vehículo
    {
      title: "Información del Vehículo",
      content: PDFSectionHelpers.createSummarySection({
        "Marca/Modelo": `${motorcycle.brand?.name} ${motorcycle.model?.name}`,
        Año: motorcycle.year?.toString() || "N/A",
        Color: motorcycle.color?.name || "N/A",
        Chasis: motorcycle.chassisNumber || "N/A",
        Motor: motorcycle.engineNumber || "N/A",
        Kilometraje: `${motorcycle.mileage} km`,
        Cilindrada: `${motorcycle.displacement || "N/A"} cc`,
      }),
    },

    // Sección Información de Pago
    {
      title: "Información de Pago",
      content: (pdf, currentY, contentWidth) => {
        // Crear datos dinámicos para el resumen de pago
        const paymentSummary: { [key: string]: string } = {
          "Método de Pago": getPaymentMethodText(),
          "Precio Base": formatAmount(basePrice),
        };

        // Agregar descuento/recargo si aplica
        if (paymentData.discountValue > 0) {
          const type = paymentData.discountType === "discount" ? "Descuento" : "Recargo";
          const sign = paymentData.discountType === "discount" ? "-" : "+";
          paymentSummary[`${type} (${paymentData.discountValue}%)`] =
            `${sign}${formatAmount(modifierAmount)}`;
        }

        paymentSummary["Precio Final"] = formatAmount(finalPrice);

        // Información específica según método de pago
        if (activeTab === "tarjeta" && paymentData.cuotas > 1) {
          paymentSummary["Número de Cuotas"] = paymentData.cuotas.toString();
          paymentSummary["Valor de Cuota"] = formatAmount(finalPrice / paymentData.cuotas);
        }

        if (activeTab === "cuenta_corriente") {
          paymentSummary["Pago Inicial"] = formatAmount(paymentData.downPayment);
          paymentSummary["Monto a Financiar"] = formatAmount(financedAmount);
          paymentSummary["Tasa de Interés"] = `${paymentData.annualInterestRate}% anual`;
          paymentSummary.Cuotas = `${paymentData.currentAccountInstallments} (${paymentData.currentAccountFrequency})`;
          paymentSummary["Valor de Cuota"] = formatAmount(
            installmentDetails.installmentAmount || 0,
          );
          paymentSummary["Total a Pagar"] = formatAmount(totalWithFinancing);

          if (
            "totalInterest" in installmentDetails &&
            installmentDetails.totalInterest !== undefined &&
            installmentDetails.totalInterest > 0
          ) {
            paymentSummary["Intereses Totales"] = formatAmount(installmentDetails.totalInterest);
          }
        }

        // Usar el helper para crear la tabla de resumen
        return PDFSectionHelpers.createSummarySection(paymentSummary)(pdf, currentY, contentWidth);
      },
    },

    // Sección Plan de Pagos (solo para cuenta corriente)
    ...(activeTab === "cuenta_corriente" &&
    installmentDetails.schedule &&
    installmentDetails.schedule.length > 0
      ? [
          {
            title: "Plan de Pagos Detallado",
            newPageBefore: true,
            content: PDFSectionHelpers.createTableSection(
              ["N°", "Capital Inicio", "Amortización", "Interés", "Cuota"],
              installmentDetails.schedule.map((item: AmortizationScheduleEntry) => [
                item.installmentNumber.toString(),
                formatAmount(item.capitalAtPeriodStart),
                formatAmount(item.amortization),
                formatAmount(item.interestForPeriod),
                formatAmount(item.calculatedInstallmentAmount),
              ]),
              {
                cellHeight: 28,
                fontSize: fontSizes.small,
                headerColor: colors.primary,
              },
            ),
            minSpaceRequired: 300,
          },
        ]
      : []),

    // Sección Información Adicional
    {
      title: "Información Adicional",
      content: (pdf, currentY, contentWidth) => {
        let y = currentY;

        // Información del vendedor
        if (userName) {
          pdf.addText(`Presupuesto generado por: ${userName}`, {
            x: margins.normal,
            y: y,
            size: fontSizes.normal,
            color: colors.textPrimary,
          });
          y -= 25;
        }

        // Términos y condiciones
        pdf.addText("Términos y Condiciones:", {
          x: margins.normal,
          y: y,
          size: fontSizes.medium,
          color: colors.textPrimary,
          font: pdf.getHelveticaBoldFont(),
        });
        y -= 20;

        const terms = [
          "• Este presupuesto es válido por 7 días desde la fecha de emisión.",
          "• Todos los precios incluyen IVA.",
          "• La disponibilidad del vehículo está sujeta a stock.",
          "• Los colores pueden variar según la disponibilidad.",
        ];

        for (const term of terms) {
          pdf.addText(term, {
            x: margins.normal,
            y,
            size: fontSizes.small,
            color: colors.textSecondary,
          });
          y -= 18;
        }

        return y - 20;
      },
    },
  ];

  // Agregar todas las secciones
  await template.addSections(sections);

  // Finalizar y retornar
  return template.finalize();
}

// Función para crear una respuesta HTTP con el PDF
export function createQuotePDFResponse(
  pdfBytes: Uint8Array,
  filename = "Presupuesto.pdf",
): Response {
  return createPDFResponse(pdfBytes, filename);
}
