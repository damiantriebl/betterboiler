"use client"; // @react-pdf/renderer works on the client or server for generation, but this component will be used by a client page.

import type { CurrentAccountForReport } from "@/actions/current-accounts/get-current-account-for-report";
import type { CurrentAccountStatus, Payment, PaymentFrequency } from "@prisma/client";
import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type React from "react";

// Registering a font (optional, but good for non-Latin characters or specific styles)
// Make sure to have the font file in your public folder or accessible path
// Font.register({
//   family: 'Roboto',
//   fonts: [
//     { src: '/fonts/Roboto-Regular.ttf' },
//     { src: '/fonts/Roboto-Bold.ttf', fontWeight: 'bold' },
//   ],
// });

// Consistent Styling
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica", // Default font
    fontSize: 9,
    paddingTop: 30,
    paddingLeft: 40,
    paddingRight: 40,
    paddingBottom: 30,
    lineHeight: 1.5,
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
  },
  header: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
    color: "#333333",
    fontWeight: "bold",
  },
  section: {
    marginBottom: 15,
    padding: 10,
    border: "1pt solid #EEEEEE",
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: "bold",
    color: "#4A4A4A",
    borderBottom: "1pt solid #EEEEEE",
    paddingBottom: 4,
  },
  subSection: {
    marginTop: 10,
    marginBottom: 5,
  },
  label: {
    fontWeight: "bold",
    color: "#555555",
  },
  text: {
    marginBottom: 3,
    color: "#333333",
  },
  table: {
    display: "table" as const,
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#BFBFBF",
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableColHeader: {
    width: "12.5%", // Adjust as needed for 8 columns, or set specific widths
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#BFBFBF",
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "#F0F0F0",
    padding: 5,
    fontWeight: "bold",
    textAlign: "center",
  },
  tableCol: {
    width: "12.5%", // Adjust as needed
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#BFBFBF",
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
    textAlign: "left",
  },
  tableCellRight: {
    textAlign: "right",
  },
  tableCellCenter: {
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    fontSize: 8,
    bottom: 15,
    left: 0,
    right: 0,
    textAlign: "center",
    color: "grey",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridItem: {
    width: "48%", // Two columns
    marginBottom: 5,
  },
  notesSection: {
    marginTop: 10,
    padding: 8,
    backgroundColor: "#F9F9F9",
    border: "1pt solid #EEEEEE",
    borderRadius: 3,
  },
});

// Helper: Format currency (rounded up, no decimals, ARS)
const formatCurrencyForPdf = (amount: number | null | undefined, currencySymbol = "$") => {
  if (amount === null || amount === undefined) return "-";
  return `${currencySymbol}${Math.ceil(amount).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Helper: Format date
const formatDateForPdf = (dateString: string | Date | null | undefined) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
  } catch (e) {
    return "-";
  }
};

// Adapted from CurrentAccountsTable.tsx
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
  paymentId?: string | null; // Kept for potential keying, less for display
  installmentVersion?: string | null; // D, H, or null
  originalPaymentAmount?: number; // Amount from payment record if it exists

  // Fields from French amortization plan
  capitalAtPeriodStart?: number;
  amortization?: number;
  interestForPeriod?: number;
  calculatedInstallmentAmount?: number; // Theoretical installment from plan
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
      // Edge case if rounding leads to amortizationAmount <=0 but interest is due
      // ensure installment covers at least interest. Amortization might be low/zero.
      amortizationAmount = 0; // Avoid negative amortization
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
    // Calculate due date based on frequency
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
        amortization: planEntry?.amortization, // Amortization and interest are from the *plan* for paid installments too
        interestForPeriod: planEntry?.interestForPeriod,
        calculatedInstallmentAmount: planEntry?.calculatedInstallmentAmount,
      });
    }

    if (dPayment) {
      generatedInstallments.push({
        number: installmentNumber,
        dueDate: dPayment.paymentDate || dueDate, // Use payment date if available
        amount: Math.ceil(dPayment.amountPaid),
        isPaid: false, // D/H are not "paid" in the sense of satisfying the installment
        paymentDate: dPayment.paymentDate,
        paymentId: dPayment.id,
        installmentVersion: "D",
        originalPaymentAmount: Math.ceil(dPayment.amountPaid),
        // No plan details for D/H entries in terms of capital/interest contribution
      });
    }
    if (hPayment) {
      generatedInstallments.push({
        number: installmentNumber,
        dueDate: hPayment.paymentDate || dueDate,
        amount: Math.ceil(hPayment.amountPaid), // Should be negative
        isPaid: false,
        paymentDate: hPayment.paymentDate,
        paymentId: hPayment.id,
        installmentVersion: "H",
        originalPaymentAmount: Math.ceil(hPayment.amountPaid),
      });
    }

    // If no normal payment, and no D/H marking it as part of an annulment process that would hide the original pending one,
    // OR if there was a D/H, meaning the original installment is now pending again.
    const isAnnulledAndThusPendingAgain = dPayment || hPayment;
    if (!normalPayment || isAnnulledAndThusPendingAgain) {
      if (planEntry) {
        // Only add "pending" if there isn't already a normal active payment.
        // And ensure we are not adding a duplicate if the D/H logic implies it's pending.
        // If there is a D or H, we definitely want to show the pending version.
        // If there is no normal payment, and no D/H, it's simply pending.
        if (!normalPayment || isAnnulledAndThusPendingAgain) {
          const existingPending = generatedInstallments.find(
            (gi) => gi.number === installmentNumber && !gi.isPaid && !gi.installmentVersion,
          );
          if (!existingPending) {
            // Avoid adding duplicate pending if already added above implicitly
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

  // Sort installments for consistent display
  return generatedInstallments.sort((a, b) => {
    if (a.number !== b.number) return a.number - b.number;
    // Order: Normal Paid -> D -> H -> Pending
    const getOrderScore = (inst: PdfInstallmentInfo) => {
      if (inst.isPaid && inst.installmentVersion !== "D" && inst.installmentVersion !== "H")
        return 0; // Normal Paid
      if (inst.installmentVersion === "D") return 1;
      if (inst.installmentVersion === "H") return 2;
      if (!inst.isPaid && !inst.installmentVersion) return 3; // Pending
      return 4; // Should not happen
    };
    return getOrderScore(a) - getOrderScore(b);
  });
}

interface CurrentAccountReportDocumentProps {
  account: CurrentAccountForReport;
}

// The PDF Document
const CurrentAccountReportDocument: React.FC<CurrentAccountReportDocumentProps> = ({ account }) => {
  const reportDate = formatDateForPdf(new Date());
  const client = account.client;
  const motorcycle = account.motorcycle;
  const seller = motorcycle?.seller;

  const installmentsForPdf = generateInstallmentsForPdf(account);

  // Recalculate financial summary based on the amortization plan for consistency
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

  // Column widths for installment table
  const colWidths = {
    num: "7%",
    dueDate: "13%",
    capStart: "15%",
    amort: "15%",
    interest: "13%",
    cuota: "15%",
    status: "22%",
  };

  return (
    <Document
      title={`Reporte Cuenta Corriente - ${client.firstName} ${client.lastName} `}
      author={account.organization?.name || "Sistema"}
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Reporte de Cuenta Corriente</Text>

        {/* Organization Info */}
        {account.organization && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Organización</Text>
            <Text style={styles.text}>
              <Text style={styles.label}>Nombre:</Text> {account.organization.name}
            </Text>
            {/* Add more org details if needed, e.g. address, contact from DB */}
          </View>
        )}

        {/* Client Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Cliente</Text>
          <View style={styles.gridContainer}>
            <Text style={styles.gridItem}>
              <Text style={styles.label}>Nombre:</Text> {client.firstName} {client.lastName}
            </Text>
            <Text style={styles.gridItem}>
              <Text style={styles.label}>Email:</Text> {client.email}
            </Text>
            <Text style={styles.gridItem}>
              <Text style={styles.label}>ID Fiscal (CUIT/CUIL):</Text> {client.taxId}
            </Text>
            <Text style={styles.gridItem}>
              <Text style={styles.label}>Teléfono:</Text> {client.phone || "N/A"}
            </Text>
            <Text style={styles.gridItem}>
              <Text style={styles.label}>Móvil:</Text> {client.mobile || "N/A"}
            </Text>
            <Text style={styles.gridItem}>
              <Text style={styles.label}>Dirección:</Text> {client.address || "N/A"}
            </Text>
            <Text style={styles.gridItem}>
              <Text style={styles.label}>Estado IVA:</Text> {client.vatStatus || "N/A"}
            </Text>
            <Text style={styles.gridItem}>
              <Text style={styles.label}>Tipo Cliente:</Text>
              {client.type === "company" ? "Empresa" : "Particular"}
            </Text>
          </View>
          {client.notes && (
            <View style={styles.subSection}>
              <Text style={styles.label}>Notas Cliente:</Text>
              <Text style={styles.text}>{client.notes}</Text>
            </View>
          )}
        </View>

        {/* Motorcycle Info */}
        {motorcycle && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información del Vehículo</Text>
            <View style={styles.gridContainer}>
              <Text style={styles.gridItem}>
                <Text style={styles.label}>Marca:</Text> {motorcycle.brand?.name || "N/A"}
              </Text>
              <Text style={styles.gridItem}>
                <Text style={styles.label}>Modelo:</Text> {motorcycle.model?.name || "N/A"}
              </Text>
              <Text style={styles.gridItem}>
                <Text style={styles.label}>Año:</Text> {motorcycle.year}
              </Text>
              <Text style={styles.gridItem}>
                <Text style={styles.label}>Color:</Text> {motorcycle.color?.name || "N/A"}
              </Text>
              <Text style={styles.gridItem}>
                <Text style={styles.label}>Nº Chasis:</Text> {motorcycle.chassisNumber}
              </Text>
              <Text style={styles.gridItem}>
                <Text style={styles.label}>Nº Motor:</Text> {motorcycle.engineNumber || "N/A"}
              </Text>
              <Text style={styles.gridItem}>
                <Text style={styles.label}>Precio Venta:</Text>
                {formatCurrencyForPdf(motorcycle.retailPrice, account.currency || "$")}
              </Text>
              <Text style={styles.gridItem}>
                <Text style={styles.label}>Sucursal:</Text> {motorcycle.branch?.name || "N/A"}
              </Text>
            </View>
            {seller && (
              <View style={styles.subSection}>
                <Text style={styles.label}>Vendido por:</Text>
                <Text style={styles.text}>
                  {seller.name} ({seller.email})
                </Text>
              </View>
            )}
            {motorcycle.observations && (
              <View style={styles.subSection}>
                <Text style={styles.label}>Observaciones Vehículo:</Text>
                <Text style={styles.text}>{motorcycle.observations}</Text>
              </View>
            )}
          </View>
        )}

        {/* Current Account Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen de Cuenta Corriente</Text>
          <View style={styles.gridContainer}>
            <Text style={styles.gridItem}>
              <Text style={styles.label}>ID Cuenta:</Text> {account.id}
            </Text>
            <Text style={styles.gridItem}>
              <Text style={styles.label}>Estado Cuenta:</Text>
              {statusTranslations[account.status] || account.status}
            </Text>
            <Text style={styles.gridItem}>
              <Text style={styles.label}>Monto Total (c/Int.):</Text>
              {formatCurrencyForPdf(grandTotalObligation, account.currency || "$")}
            </Text>
            <Text style={styles.gridItem}>
              <Text style={styles.label}>Pago Inicial:</Text>
              {formatCurrencyForPdf(account.downPayment, account.currency || "$")}
            </Text>
            <Text style={styles.gridItem}>
              <Text style={styles.label}>Monto Financiado:</Text>
              {formatCurrencyForPdf(financialPrincipal, account.currency || "$")}
            </Text>
            <Text style={styles.gridItem}>
              <Text style={styles.label}>Tasa Interés Anual:</Text> {account.interestRate ?? 0}%
            </Text>
            <Text style={styles.gridItem}>
              <Text style={styles.label}>Nº Cuotas:</Text> {account.numberOfInstallments}
            </Text>
            <Text style={styles.gridItem}>
              <Text style={styles.label}>Frecuencia:</Text>
              {frequencyMap[account.paymentFrequency] || account.paymentFrequency}
            </Text>
            <Text style={styles.gridItem}>
              <Text style={styles.label}>Fecha Inicio (1er Venc.):</Text>
              {formatDateForPdf(account.startDate)}
            </Text>
            <Text style={styles.gridItem}>
              <Text style={styles.label}>Monto Total Pagado:</Text>
              {formatCurrencyForPdf(totalEffectivelyPaid, account.currency || "$")}
            </Text>
            <Text style={styles.gridItem}>
              <Text style={styles.label}>Saldo Pendiente (c/Int.):</Text>
              {formatCurrencyForPdf(uiRemainingAmountDisplay, account.currency || "$")}
            </Text>
          </View>
          {account.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.label}>Notas de la Cuenta Corriente:</Text>
              <Text style={styles.text}>{account.notes}</Text>
            </View>
          )}
        </View>

        {/* Installments Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle de Cuotas</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableRow} fixed>
              <Text style={{ ...styles.tableColHeader, width: colWidths.num }}>Nº</Text>
              <Text style={{ ...styles.tableColHeader, width: colWidths.dueDate }}>
                Vencimiento
              </Text>
              <Text style={{ ...styles.tableColHeader, width: colWidths.capStart }}>
                Cap. Inicio
              </Text>
              <Text style={{ ...styles.tableColHeader, width: colWidths.amort }}>Amortización</Text>
              <Text style={{ ...styles.tableColHeader, width: colWidths.interest }}>Interés</Text>
              <Text style={{ ...styles.tableColHeader, width: colWidths.cuota }}>Cuota</Text>
              <Text style={{ ...styles.tableColHeader, width: colWidths.status }}>Estado</Text>
            </View>
            {/* Table Body */}
            {installmentsForPdf.map((inst, index) => (
              <View
                key={inst.paymentId || `inst-${inst.number}-${index}`}
                style={styles.tableRow}
                wrap={false}
              >
                <Text
                  style={{ ...styles.tableCol, ...styles.tableCellCenter, width: colWidths.num }}
                >
                  {inst.number}
                  {inst.installmentVersion && inst.installmentVersion !== "Original (Anulado)"
                    ? String(inst.installmentVersion).toUpperCase()
                    : ""}
                </Text>
                <Text style={{ ...styles.tableCol, width: colWidths.dueDate }}>
                  {formatDateForPdf(inst.dueDate)}
                </Text>
                <Text
                  style={{
                    ...styles.tableCol,
                    ...styles.tableCellRight,
                    width: colWidths.capStart,
                  }}
                >
                  {inst.capitalAtPeriodStart !== undefined
                    ? formatCurrencyForPdf(inst.capitalAtPeriodStart, "")
                    : "-"}
                </Text>
                <Text
                  style={{ ...styles.tableCol, ...styles.tableCellRight, width: colWidths.amort }}
                >
                  {inst.amortization !== undefined &&
                    inst.installmentVersion !== "D" &&
                    inst.installmentVersion !== "H"
                    ? formatCurrencyForPdf(inst.amortization, "")
                    : "-"}
                </Text>
                <Text
                  style={{
                    ...styles.tableCol,
                    ...styles.tableCellRight,
                    width: colWidths.interest,
                  }}
                >
                  {inst.interestForPeriod !== undefined &&
                    inst.installmentVersion !== "D" &&
                    inst.installmentVersion !== "H"
                    ? formatCurrencyForPdf(inst.interestForPeriod, "")
                    : "-"}
                </Text>
                <Text
                  style={{
                    ...styles.tableCol,
                    ...styles.tableCellRight,
                    fontWeight: "bold",
                    width: colWidths.cuota,
                  }}
                >
                  {formatCurrencyForPdf(
                    (inst.installmentVersion === "H" ? -1 : 1) *
                    (inst.isPaid && inst.originalPaymentAmount !== undefined
                      ? inst.originalPaymentAmount
                      : (inst.calculatedInstallmentAmount ?? inst.amount)),
                    account.currency || "$",
                  )}
                </Text>
                <Text style={{ ...styles.tableCol, width: colWidths.status }}>
                  {inst.installmentVersion === "D"
                    ? "Anulación (D)"
                    : inst.installmentVersion === "H"
                      ? "Anulación (H)"
                      : inst.isPaid
                        ? `Pagada ${inst.paymentDate ? formatDateForPdf(inst.paymentDate) : ""}`
                        : "Pendiente"}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footer} fixed>
          Reporte generado el {reportDate} por {account.organization?.name || "Sistema"}. Página
          {"{{pageNumber}}"} de {"{{totalPages}}"}
        </Text>
      </Page>
    </Document>
  );
};

export default CurrentAccountReportDocument;
