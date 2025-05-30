import type { CurrentAccountForReport } from "@/actions/current-accounts/get-current-account-for-report";
import { PDFBuilder, colors, fontSizes, margins } from "@/lib/pdf-lib-utils";
import type { CurrentAccountStatus, Payment, PaymentFrequency } from "@prisma/client";

interface AmortizationScheduleEntry {
  installmentNumber: number;
  capitalAtPeriodStart: number;
  interestForPeriod: number;
  amortization: number;
  calculatedInstallmentAmount: number;
  capitalAtPeriodEnd: number;
}

interface PdfInstallmentInfo {
  number: number;
  dueDate: Date;
  amount: number;
  isPaid: boolean;
  paymentDate?: Date | null;
  paymentId?: string | null;
  installmentVersion?: string | null;
  originalPaymentAmount?: number;
  capitalAtPeriodStart?: number;
  amortization?: number;
  interestForPeriod?: number;
  calculatedInstallmentAmount?: number;
}

function getPeriodsPerYearForPdf(frequency: PaymentFrequency): number {
  switch (frequency) {
    case "WEEKLY":
      return 52;
    case "BIWEEKLY":
      return 26;
    case "MONTHLY":
      return 12;
    case "QUARTERLY":
      return 4;
    case "ANNUALLY":
      return 1;
    default:
      return 12;
  }
}

function calculateFrenchAmortizationScheduleForPdf(
  principal: number,
  annualInterestRatePercent: number,
  numberOfInstallments: number,
  paymentFrequency: PaymentFrequency,
): AmortizationScheduleEntry[] {
  if (principal <= 0 || numberOfInstallments <= 0 || annualInterestRatePercent < 0) return [];

  const schedule: AmortizationScheduleEntry[] = [];
  const periodsPerYear = getPeriodsPerYearForPdf(paymentFrequency);
  const periodicInterestRate = annualInterestRatePercent / 100 / periodsPerYear;
  let currentCapital = principal;

  if (annualInterestRatePercent === 0 || periodicInterestRate === 0) {
    const installmentAmt = Math.ceil(principal / numberOfInstallments);
    for (let i = 1; i <= numberOfInstallments; i++) {
      const capitalToAmortize = i === numberOfInstallments ? currentCapital : installmentAmt;
      schedule.push({
        installmentNumber: i,
        capitalAtPeriodStart: currentCapital,
        interestForPeriod: 0,
        amortization: Math.ceil(capitalToAmortize),
        calculatedInstallmentAmount: Math.ceil(capitalToAmortize),
        capitalAtPeriodEnd: Math.max(0, currentCapital - capitalToAmortize),
      });
      currentCapital -= capitalToAmortize;
      if (currentCapital < 0) currentCapital = 0;
    }
    return schedule;
  }

  const pmtNumerator = periodicInterestRate * (1 + periodicInterestRate) ** numberOfInstallments;
  const pmtDenominator = (1 + periodicInterestRate) ** numberOfInstallments - 1;
  const rawPmt = principal * (pmtNumerator / pmtDenominator);
  const fixedInstallment = Math.ceil(rawPmt);

  for (let i = 1; i <= numberOfInstallments; i++) {
    const interest = Math.ceil(currentCapital * periodicInterestRate);
    let amortizationAmount = fixedInstallment - interest;
    let finalInstallmentAmountForEntry = fixedInstallment;

    if (i === numberOfInstallments) {
      amortizationAmount = currentCapital;
      finalInstallmentAmountForEntry = Math.ceil(currentCapital + interest);
    } else if (amortizationAmount > currentCapital && currentCapital > 0) {
      amortizationAmount = currentCapital;
      finalInstallmentAmountForEntry = Math.ceil(currentCapital + interest);
    } else if (amortizationAmount <= 0 && interest > 0 && fixedInstallment > 0) {
      amortizationAmount = 0;
      finalInstallmentAmountForEntry =
        Math.ceil(currentCapital + interest) < fixedInstallment
          ? fixedInstallment
          : Math.ceil(currentCapital + interest);
      if (finalInstallmentAmountForEntry - interest > currentCapital)
        amortizationAmount = currentCapital;
      else amortizationAmount = finalInstallmentAmountForEntry - interest;
    }

    const capitalEnd = Math.max(0, currentCapital - Math.ceil(amortizationAmount));
    schedule.push({
      installmentNumber: i,
      capitalAtPeriodStart: Math.ceil(currentCapital),
      interestForPeriod: interest,
      amortization: Math.ceil(amortizationAmount),
      calculatedInstallmentAmount: finalInstallmentAmountForEntry,
      capitalAtPeriodEnd: Math.ceil(capitalEnd),
    });
    currentCapital = capitalEnd;
    if (currentCapital < 0.01) currentCapital = 0;
  }
  return schedule;
}

function generateInstallmentsForPdf(account: CurrentAccountForReport): PdfInstallmentInfo[] {
  const generatedInstallments: PdfInstallmentInfo[] = [];
  const startDate = new Date(account.startDate);
  const financialPrincipal = account.totalAmount - account.downPayment;

  const frenchAmortizationPlan = calculateFrenchAmortizationScheduleForPdf(
    financialPrincipal,
    account.interestRate ?? 0,
    account.numberOfInstallments,
    account.paymentFrequency,
  );

  const paymentsByInstallmentNumber: Record<number, Payment[]> = {};
  for (const p of account.payments ?? []) {
    if (p.installmentNumber !== null) {
      if (!paymentsByInstallmentNumber[p.installmentNumber]) {
        paymentsByInstallmentNumber[p.installmentNumber] = [];
      }
      paymentsByInstallmentNumber[p.installmentNumber].push(p);
    }
  }

  for (let i = 0; i < account.numberOfInstallments; i++) {
    const installmentNumber = i + 1;
    const planEntry = frenchAmortizationPlan.find((p) => p.installmentNumber === installmentNumber);
    const dueDate = new Date(startDate);

    switch (account.paymentFrequency) {
      case "WEEKLY":
        dueDate.setDate(startDate.getDate() + 7 * i);
        break;
      case "BIWEEKLY":
        dueDate.setDate(startDate.getDate() + 14 * i);
        break;
      case "MONTHLY": {
        const mDate = new Date(startDate);
        mDate.setMonth(mDate.getMonth() + i);
        dueDate.setTime(mDate.getTime());
        break;
      }
      case "QUARTERLY": {
        const qDate = new Date(startDate);
        qDate.setMonth(qDate.getMonth() + 3 * i);
        dueDate.setTime(qDate.getTime());
        break;
      }
      case "ANNUALLY": {
        const aDate = new Date(startDate);
        aDate.setFullYear(aDate.getFullYear() + i);
        dueDate.setTime(aDate.getTime());
        break;
      }
    }

    const paymentsForThis = paymentsByInstallmentNumber[installmentNumber] || [];
    const normalPayment = paymentsForThis.find(
      (p) => p.installmentVersion !== "D" && p.installmentVersion !== "H",
    );
    const dPayment = paymentsForThis.find((p) => p.installmentVersion === "D");
    const hPayment = paymentsForThis.find((p) => p.installmentVersion === "H");

    if (normalPayment) {
      generatedInstallments.push({
        number: installmentNumber,
        dueDate,
        amount: Math.ceil(normalPayment.amountPaid),
        isPaid: true,
        paymentDate: normalPayment.paymentDate,
        paymentId: normalPayment.id,
        installmentVersion: normalPayment.installmentVersion,
        originalPaymentAmount: Math.ceil(normalPayment.amountPaid),
        capitalAtPeriodStart: planEntry?.capitalAtPeriodStart,
        amortization: planEntry?.amortization,
        interestForPeriod: planEntry?.interestForPeriod,
        calculatedInstallmentAmount: planEntry?.calculatedInstallmentAmount,
      });
    }

    if (dPayment) {
      generatedInstallments.push({
        number: installmentNumber,
        dueDate: dPayment.paymentDate || dueDate,
        amount: Math.ceil(dPayment.amountPaid),
        isPaid: false,
        paymentDate: dPayment.paymentDate,
        paymentId: dPayment.id,
        installmentVersion: "D",
        originalPaymentAmount: Math.ceil(dPayment.amountPaid),
      });
    }

    if (hPayment) {
      generatedInstallments.push({
        number: installmentNumber,
        dueDate: hPayment.paymentDate || dueDate,
        amount: Math.ceil(hPayment.amountPaid),
        isPaid: false,
        paymentDate: hPayment.paymentDate,
        paymentId: hPayment.id,
        installmentVersion: "H",
        originalPaymentAmount: Math.ceil(hPayment.amountPaid),
      });
    }

    const isAnnulledAndThusPendingAgain = dPayment || hPayment;
    if (!normalPayment || isAnnulledAndThusPendingAgain) {
      if (planEntry) {
        if (!normalPayment || isAnnulledAndThusPendingAgain) {
          const existingPending = generatedInstallments.find(
            (gi) => gi.number === installmentNumber && !gi.isPaid && !gi.installmentVersion,
          );
          if (!existingPending) {
            generatedInstallments.push({
              number: installmentNumber,
              dueDate,
              amount: Math.ceil(planEntry.calculatedInstallmentAmount),
              isPaid: false,
              originalPaymentAmount: undefined,
              capitalAtPeriodStart: planEntry.capitalAtPeriodStart,
              amortization: planEntry.amortization,
              interestForPeriod: planEntry.interestForPeriod,
              calculatedInstallmentAmount: planEntry.calculatedInstallmentAmount,
            });
          }
        }
      }
    }
  }

  return generatedInstallments.sort((a, b) => {
    if (a.number !== b.number) return a.number - b.number;
    const getOrderScore = (inst: PdfInstallmentInfo) => {
      if (inst.isPaid && inst.installmentVersion !== "D" && inst.installmentVersion !== "H")
        return 0;
      if (inst.installmentVersion === "D") return 1;
      if (inst.installmentVersion === "H") return 2;
      if (!inst.isPaid && !inst.installmentVersion) return 3;
      return 4;
    };
    return getOrderScore(a) - getOrderScore(b);
  });
}

export async function generateCurrentAccountReportPDF(
  account: CurrentAccountForReport,
): Promise<Uint8Array> {
  const pdf = await PDFBuilder.create();
  const { width, height } = pdf.getPageDimensions();

  let currentY = height - margins.normal;
  const contentWidth = width - margins.normal * 2;

  const formatDateForPdf = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
    } catch (e) {
      return "-";
    }
  };

  const formatCurrencyForPdf = (amount: number | null | undefined, currencySymbol = "$") => {
    if (amount === null || amount === undefined) return "-";
    return `${currencySymbol}${Math.ceil(amount).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const reportDate = formatDateForPdf(new Date());
  const client = account.client;
  const motorcycle = account.motorcycle;
  const seller = motorcycle?.seller;

  const installmentsForPdf = generateInstallmentsForPdf(account);

  const financialPrincipal = account.totalAmount - account.downPayment;
  const amortizationPlan = calculateFrenchAmortizationScheduleForPdf(
    financialPrincipal,
    account.interestRate ?? 0,
    account.numberOfInstallments,
    account.paymentFrequency,
  );
  const totalAmountOfAllCalculatedInstallments = amortizationPlan.reduce(
    (sum, entry) => sum + Math.ceil(entry.calculatedInstallmentAmount),
    0,
  );
  const grandTotalObligation = account.downPayment + totalAmountOfAllCalculatedInstallments;

  const actualInstallmentPaymentsAmount = account.payments
    .filter(
      (p) =>
        p.installmentVersion !== "D" &&
        p.installmentVersion !== "H" &&
        p.installmentNumber !== null &&
        p.installmentNumber > 0,
    )
    .reduce((sum, payment) => sum + payment.amountPaid, 0);
  const totalEffectivelyPaid = account.downPayment + actualInstallmentPaymentsAmount;
  const uiRemainingAmountDisplay = Math.max(0, grandTotalObligation - totalEffectivelyPaid);

  const frequencyMap: Record<string, string> = {
    WEEKLY: "Semanal",
    BIWEEKLY: "Quincenal",
    MONTHLY: "Mensual",
    QUARTERLY: "Trimestral",
    ANNUALLY: "Anual",
  };
  const statusTranslations: Record<string, string> = {
    ACTIVE: "Activa",
    PAID_OFF: "Pagada",
    OVERDUE: "Vencida",
    DEFAULTED: "Impago",
    CANCELLED: "Cancelada",
  };

  // Título principal
  pdf.addCenteredTitle("Reporte de Cuenta Corriente", currentY);
  currentY -= 60;

  // Información de la organización
  if (account.organization) {
    currentY = pdf.addSection("Organización", margins.normal, currentY, contentWidth);

    pdf.addText(`Nombre: ${account.organization.name}`, {
      x: margins.normal + 10,
      y: currentY,
      size: fontSizes.normal,
    });
    currentY -= 40;
  }

  // Información del cliente
  currentY = pdf.addSection("Información del Cliente", margins.normal, currentY, contentWidth);

  const clientInfo = [
    `Nombre: ${client.firstName} ${client.lastName}`,
    `Email: ${client.email}`,
    `ID Fiscal (CUIT/CUIL): ${client.taxId}`,
    `Teléfono: ${client.phone || "N/A"}`,
    `Móvil: ${client.mobile || "N/A"}`,
    `Dirección: ${client.address || "N/A"}`,
    `Estado IVA: ${client.vatStatus || "N/A"}`,
    `Tipo Cliente: ${client.type === "company" ? "Empresa" : "Particular"}`,
  ];

  for (const text of clientInfo) {
    pdf.addText(text, {
      x: margins.normal,
      y: currentY,
      size: fontSizes.normal,
      color: colors.textPrimary,
    });
    currentY -= 12;
  }

  if (client.notes) {
    currentY -= 5;
    pdf.addText(`Notas Cliente: ${client.notes}`, {
      x: margins.normal + 10,
      y: currentY,
      size: fontSizes.small,
    });
    currentY -= 15;
  }

  currentY -= 30;

  // Información del vehículo
  if (motorcycle) {
    if (currentY < 200) {
      pdf.addPage();
      currentY = height - margins.normal;
    }

    currentY = pdf.addSection("Información del Vehículo", margins.normal, currentY, contentWidth);

    const motorcycleInfo = [
      `Marca: ${motorcycle.brand?.name || "N/A"}`,
      `Modelo: ${motorcycle.model?.name || "N/A"}`,
      `Año: ${motorcycle.year}`,
      `Color: ${motorcycle.color?.name || "N/A"}`,
      `Nº Chasis: ${motorcycle.chassisNumber}`,
      `Nº Motor: ${motorcycle.engineNumber || "N/A"}`,
      `Precio Venta: ${formatCurrencyForPdf(motorcycle.retailPrice, account.currency || "$")}`,
      `Sucursal: ${motorcycle.branch?.name || "N/A"}`,
    ];

    for (const text of motorcycleInfo) {
      pdf.addText(text, {
        x: margins.normal + 10,
        y: currentY,
        size: fontSizes.small,
        color: colors.textSecondary,
      });
      currentY -= 12;
    }

    if (seller) {
      currentY -= 5;
      pdf.addText(`Vendido por: ${seller.name} (${seller.email})`, {
        x: margins.normal + 10,
        y: currentY,
        size: fontSizes.small,
      });
      currentY -= 15;
    }

    if (motorcycle.observations) {
      currentY -= 5;
      pdf.addText(`Observaciones Vehículo: ${motorcycle.observations}`, {
        x: margins.normal + 10,
        y: currentY,
        size: fontSizes.small,
      });
      currentY -= 15;
    }

    currentY -= 30;
  }

  // Resumen de cuenta corriente
  if (currentY < 200) {
    pdf.addPage();
    currentY = height - margins.normal;
  }

  currentY = pdf.addSection("Resumen de Cuenta Corriente", margins.normal, currentY, contentWidth);

  const accountInfo = [
    `ID Cuenta: ${account.id}`,
    `Estado Cuenta: ${statusTranslations[account.status] || account.status}`,
    `Monto Total (c/Int.): ${formatCurrencyForPdf(grandTotalObligation, account.currency || "$")}`,
    `Pago Inicial: ${formatCurrencyForPdf(account.downPayment, account.currency || "$")}`,
    `Monto Financiado: ${formatCurrencyForPdf(financialPrincipal, account.currency || "$")}`,
    `Tasa Interés Anual: ${account.interestRate ?? 0}%`,
    `Nº Cuotas: ${account.numberOfInstallments}`,
    `Frecuencia: ${frequencyMap[account.paymentFrequency] || account.paymentFrequency}`,
    `Fecha Inicio (1er Venc.): ${formatDateForPdf(account.startDate)}`,
    `Monto Total Pagado: ${formatCurrencyForPdf(totalEffectivelyPaid, account.currency || "$")}`,
    `Saldo Pendiente (c/Int.): ${formatCurrencyForPdf(uiRemainingAmountDisplay, account.currency || "$")}`,
  ];

  for (const text of accountInfo) {
    pdf.addText(text, {
      x: margins.normal,
      y: currentY,
      size: fontSizes.normal,
      color: colors.textPrimary,
    });
    currentY -= 12;
  }

  if (account.notes) {
    currentY -= 5;
    pdf.addText(`Notas de la Cuenta Corriente: ${account.notes}`, {
      x: margins.normal + 10,
      y: currentY,
      size: fontSizes.small,
    });
    currentY -= 15;
  }

  currentY -= 40;

  // Detalle de cuotas
  if (currentY < 300) {
    pdf.addPage();
    currentY = height - margins.normal;
  }

  currentY = pdf.addSection("Detalle de Cuotas", margins.normal, currentY, contentWidth);

  const installmentHeaders = [
    "Nº",
    "Vencimiento",
    "Cap. Inicio",
    "Amortización",
    "Interés",
    "Cuota",
    "Estado",
  ];
  const installmentRows = installmentsForPdf.map((inst) => [
    `${inst.number}${inst.installmentVersion && inst.installmentVersion !== "Original (Anulado)" ? String(inst.installmentVersion).toUpperCase() : ""}`,
    formatDateForPdf(inst.dueDate),
    inst.capitalAtPeriodStart !== undefined
      ? formatCurrencyForPdf(inst.capitalAtPeriodStart, "")
      : "-",
    inst.amortization !== undefined &&
    inst.installmentVersion !== "D" &&
    inst.installmentVersion !== "H"
      ? formatCurrencyForPdf(inst.amortization, "")
      : "-",
    inst.interestForPeriod !== undefined &&
    inst.installmentVersion !== "D" &&
    inst.installmentVersion !== "H"
      ? formatCurrencyForPdf(inst.interestForPeriod, "")
      : "-",
    formatCurrencyForPdf(
      (inst.installmentVersion === "H" ? -1 : 1) *
        (inst.isPaid && inst.originalPaymentAmount !== undefined
          ? inst.originalPaymentAmount
          : (inst.calculatedInstallmentAmount ?? inst.amount)),
      account.currency || "$",
    ),
    inst.installmentVersion === "D"
      ? "Anulación (D)"
      : inst.installmentVersion === "H"
        ? "Anulación (H)"
        : inst.isPaid
          ? `Pagada ${inst.paymentDate ? formatDateForPdf(inst.paymentDate) : ""}`
          : "Pendiente",
  ]);

  pdf.addTable({
    x: margins.normal,
    y: currentY,
    width: contentWidth,
    cellHeight: 16,
    headers: installmentHeaders,
    rows: installmentRows,
    fontSize: fontSizes.tiny,
  });

  // Pie de página
  const now = new Date().toLocaleDateString("es-AR");
  pdf.addText(`Reporte generado el ${reportDate} por ${account.organization?.name || "Sistema"}`, {
    x: margins.normal,
    y: 30,
    size: fontSizes.small,
    color: colors.gray,
  });

  return pdf.finalize();
}

// Función para crear una respuesta HTTP con el PDF
export function createCurrentAccountReportPDFResponse(
  pdfBytes: Uint8Array,
  filename: string,
): Response {
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBytes.length.toString(),
    },
  });
}
