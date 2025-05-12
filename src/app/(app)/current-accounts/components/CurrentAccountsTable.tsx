"use client";

import React, { useState, useEffect } from "react";
import type { CurrentAccountWithDetails } from "@/actions/current-accounts/get-current-accounts";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, Calendar, Car, Clock, CreditCard, DollarSign, RefreshCw, User, FileText } from "lucide-react";
import PaymentModal from "./PaymentModal";
import AnnulPaymentButton from "./AnnulPaymentButton";
import { usePathname, useRouter } from "next/navigation";
import { type Payment, type CurrentAccountStatus, type PaymentFrequency } from "@prisma/client";
import Link from 'next/link';

// Función para formatear montos como pesos argentinos (redondeado hacia arriba)
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0, // Sin decimales
    maximumFractionDigits: 0, // Sin decimales
  }).format(Math.ceil(amount)); // Redondeo hacia arriba
};

const formatDate = (date: string | Date | null) => {
  if (!date) return "-";
  return format(new Date(date), "dd/MM/yyyy", { locale: es });
};

// Mapa para traducir la frecuencia de pagos
const frequencyMap: Record<string, string> = {
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
  QUARTERLY: "Trimestral",
  ANNUALLY: "Anual",
};

// Mapa para determinar el color del estado según su valor
const statusColorMap: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  PAID_OFF: "bg-blue-100 text-blue-800",
  OVERDUE: "bg-red-100 text-red-800",
  DEFAULTED: "bg-amber-100 text-amber-800",
  CANCELLED: "bg-gray-100 text-gray-800",
  ANNULLED: "bg-orange-100 text-orange-800", // New status for annulled payments
};

// Traducciones para los estados
const statusTranslations: Record<string, string> = {
  ACTIVE: "Activa",
  PAID_OFF: "Pagada",
  OVERDUE: "Vencida",
  DEFAULTED: "Impago",
  CANCELLED: "Cancelada",
  ANNULLED: "Anulada", // New translation
};

interface AmortizationScheduleEntry {
  installmentNumber: number;
  capitalAtPeriodStart: number;
  interestForPeriod: number;
  amortization: number;
  calculatedInstallmentAmount: number; // Cuota fija (puede tener ajustes en la última)
  capitalAtPeriodEnd: number;
}

interface InstallmentInfo {
  number: number;
  dueDate: Date;
  amount: number; // Monto efectivo del pago si existe, o cuota calculada si está pendiente
  isPaid: boolean;
  paymentDate?: Date | null;
  paymentId?: string | null;
  isAnnulled?: boolean;
  annulledDate?: Date | null;
  installmentVersion?: string | null;
  originalPaymentAmount?: number; // Monto del pago original (para D/H o si difiere de cuota calculada)

  // Campos del sistema francés
  capitalAtPeriodStart?: number;
  amortization?: number;         // Capital pagado en esta cuota
  interestForPeriod?: number;    // Interés pagado en esta cuota
  calculatedInstallmentAmount?: number; // Cuota fija según sistema francés
}

function getPeriodsPerYear(frequency: PaymentFrequency): number {
  switch (frequency) {
    case 'WEEKLY': return 52;
    case 'BIWEEKLY': return 26;
    case 'MONTHLY': return 12;
    case 'QUARTERLY': return 4;
    case 'ANNUALLY': return 1;
    default: return 12; // Default a mensual
  }
}

function calculateFrenchAmortizationSchedule(
  principal: number,
  annualInterestRatePercent: number,
  numberOfInstallments: number,
  paymentFrequency: PaymentFrequency
): AmortizationScheduleEntry[] {
  if (principal <= 0 || numberOfInstallments <= 0) return [];
  if (annualInterestRatePercent < 0) return []; // No permitir tasas negativas aquí

  const schedule: AmortizationScheduleEntry[] = [];
  const periodsPerYear = getPeriodsPerYear(paymentFrequency);
  const periodicInterestRate = annualInterestRatePercent / 100 / periodsPerYear;

  let currentCapital = principal;

  if (annualInterestRatePercent === 0 || periodicInterestRate === 0) {
    // Préstamo sin interés
    const installmentAmt = Math.ceil(principal / numberOfInstallments);
    for (let i = 1; i <= numberOfInstallments; i++) {
      const capitalToAmortize = (i === numberOfInstallments) ? currentCapital : installmentAmt;
      schedule.push({
        installmentNumber: i,
        capitalAtPeriodStart: currentCapital,
        interestForPeriod: 0,
        amortization: Math.ceil(capitalToAmortize), // Redondeo hacia arriba
        calculatedInstallmentAmount: Math.ceil(capitalToAmortize), // Redondeo hacia arriba
        capitalAtPeriodEnd: Math.max(0, currentCapital - capitalToAmortize),
      });
      currentCapital -= capitalToAmortize;
      if (currentCapital < 0) currentCapital = 0;
    }
    return schedule;
  }

  // Fórmula PMT para cuota fija
  const pmtNumerator = periodicInterestRate * Math.pow(1 + periodicInterestRate, numberOfInstallments);
  const pmtDenominator = Math.pow(1 + periodicInterestRate, numberOfInstallments) - 1;
  const rawPmt = principal * (pmtNumerator / pmtDenominator);
  const fixedInstallment = Math.ceil(rawPmt); // Redondeo hacia arriba de la cuota fija

  for (let i = 1; i <= numberOfInstallments; i++) {
    const interest = Math.ceil(currentCapital * periodicInterestRate);
    let amortizationAmount = fixedInstallment - interest;

    if (i === numberOfInstallments) {
      // Ajustar última cuota para saldar exactamente
      amortizationAmount = currentCapital + interest > fixedInstallment ? currentCapital : amortizationAmount; // Asegurar que la amortización no sea negativa si el interés es alto
      if (currentCapital + interest > fixedInstallment && currentCapital < fixedInstallment - interest) {
        amortizationAmount = currentCapital;
      }
      const finalInstallmentAmount = Math.ceil(currentCapital + interest);
      schedule.push({
        installmentNumber: i,
        capitalAtPeriodStart: currentCapital,
        interestForPeriod: interest, // Ya redondeado
        amortization: Math.ceil(currentCapital), // Amortizar lo que queda
        calculatedInstallmentAmount: finalInstallmentAmount,
        capitalAtPeriodEnd: 0,
      });
      currentCapital = 0;
    } else {
      if (amortizationAmount > currentCapital) { // Si la amortización calculada excede el capital restante (por redondeos)
        amortizationAmount = currentCapital;
      }
      schedule.push({
        installmentNumber: i,
        capitalAtPeriodStart: currentCapital,
        interestForPeriod: interest, // Ya redondeado
        amortization: Math.ceil(amortizationAmount), // Redondeo hacia arriba
        calculatedInstallmentAmount: fixedInstallment,
        capitalAtPeriodEnd: Math.max(0, currentCapital - Math.ceil(amortizationAmount)),
      });
      currentCapital -= Math.ceil(amortizationAmount);
      if (currentCapital < 0) currentCapital = 0;
    }
  }
  return schedule;
}

const generateInstallments = (
  account: CurrentAccountWithDetails,
  annulledPaymentIds: Set<string>
): InstallmentInfo[] => {
  const generatedInstallments: InstallmentInfo[] = [];
  const startDate = new Date(account.startDate);
  const financialPrincipal = account.totalAmount - account.downPayment;

  // Calculate amortization schedule if interest rate is applicable
  const frenchAmortizationPlan = (account.interestRate ?? 0) > 0 && financialPrincipal > 0
    ? calculateFrenchAmortizationSchedule(
      financialPrincipal,
      account.interestRate ?? 0,
      account.numberOfInstallments,
      account.paymentFrequency as PaymentFrequency
    )
    : calculateFrenchAmortizationSchedule( // Plan sin interés si no hay tasa o principal
      financialPrincipal,
      0,
      account.numberOfInstallments,
      account.paymentFrequency as PaymentFrequency
    );

  // paymentsByInstallmentNumber and annulled logic as before
  const paymentsByInstallmentNumber: Record<number, Payment[]> = {};
  if (account.payments) {
    for (const payment of account.payments) {
      if (payment.installmentNumber !== null && payment.installmentNumber !== undefined) {
        if (!paymentsByInstallmentNumber[payment.installmentNumber]) {
          paymentsByInstallmentNumber[payment.installmentNumber] = [];
        }
        paymentsByInstallmentNumber[payment.installmentNumber].push(payment);
      }
    }
  }

  let runningCapital = financialPrincipal;
  const periodsPerYear = getPeriodsPerYear(account.paymentFrequency as PaymentFrequency);
  const periodicInterestRate = (account.interestRate ?? 0) / 100 / periodsPerYear;

  for (let i = 0; i < account.numberOfInstallments; i++) {
    const installmentNumber = i + 1;
    const dueDate = new Date(startDate);
    const planEntry = frenchAmortizationPlan.find(entry => entry.installmentNumber === installmentNumber);

    // Calculate dueDate (as in your existing code)
    switch (account.paymentFrequency as PaymentFrequency) {
      case "WEEKLY": dueDate.setDate(new Date(startDate).getDate() + 7 * i); break;
      case "BIWEEKLY": dueDate.setDate(new Date(startDate).getDate() + 14 * i); break;
      case "MONTHLY": { const mDate = new Date(startDate); mDate.setMonth(mDate.getMonth() + i); dueDate.setTime(mDate.getTime()); break; }
      case "QUARTERLY": { const qDate = new Date(startDate); qDate.setMonth(qDate.getMonth() + 3 * i); dueDate.setTime(qDate.getTime()); break; }
      case "ANNUALLY": { const aDate = new Date(startDate); aDate.setFullYear(aDate.getFullYear() + i); dueDate.setTime(aDate.getTime()); break; }
    }

    const paymentsForThisInstallment = paymentsByInstallmentNumber[installmentNumber] || [];
    const normalPayment = paymentsForThisInstallment.find(p =>
      p.installmentVersion !== 'D' &&
      p.installmentVersion !== 'H' &&
      (p.id ? !annulledPaymentIds.has(p.id) : true)
    );
    const dPayment = paymentsForThisInstallment.find(p => p.installmentVersion === 'D');
    const hPayment = paymentsForThisInstallment.find(p => p.installmentVersion === 'H');

    // Encontrar si hubo un pago original que ahora está anulado en sesión
    const originalPaymentNowAnnulledInSession = paymentsForThisInstallment.find(p =>
      p.installmentVersion !== 'D' &&
      p.installmentVersion !== 'H' &&
      (p.id ? annulledPaymentIds.has(p.id) : false)
    );

    const isEffectivelyPaid = !!normalPayment;
    // Una cuota se considera "en proceso de anulación" si tiene D o H, o si su pago normal original está en la lista de anulados en sesión.
    const isUnderAnnulmentProcess = !!dPayment || !!hPayment || !!originalPaymentNowAnnulledInSession;

    // 1. Mostrar el pago normal activo (si existe y no está siendo anulado)
    if (isEffectivelyPaid) { // normalPayment ya está filtrado para no estar en annulledPaymentIdsInSession
      generatedInstallments.push({
        number: installmentNumber,
        dueDate,
        amount: Math.ceil(normalPayment.amountPaid),
        isPaid: true,
        paymentDate: normalPayment.paymentDate ? new Date(normalPayment.paymentDate) : null,
        paymentId: normalPayment.id,
        isAnnulled: false,
        installmentVersion: normalPayment.installmentVersion || null,
        originalPaymentAmount: Math.ceil(normalPayment.amountPaid),
        capitalAtPeriodStart: planEntry?.capitalAtPeriodStart ? Math.ceil(planEntry.capitalAtPeriodStart) : undefined,
        amortization: undefined,
        interestForPeriod: undefined,
        calculatedInstallmentAmount: planEntry?.calculatedInstallmentAmount ? Math.ceil(planEntry.calculatedInstallmentAmount) : Math.ceil(normalPayment.amountPaid),
      });
    }

    // 2. Si la cuota está en proceso de anulación (D/H existen o el pago original fue anulado en sesión)
    // Y/O si no está efectivamente pagada (es decir, está pendiente o su pago fue anulado)
    // Entonces, mostrar la cuota "Pendiente" según el plan francés, si aplica.
    if (!isEffectivelyPaid && !isUnderAnnulmentProcess) {
      // If the installment is pending payment and not involved in an annulment process

      // Use the potentially recalculated installment amount from the account record
      const expectedInstallmentAmount = account.installmentAmount;

      // Find the corresponding entry in the originally calculated amortization plan 
      // to get an *estimate* of capital/interest breakdown.
      // Note: This breakdown might become less accurate after recalculations, 
      // but displaying the correct expectedInstallmentAmount is the priority.
      const planEntry = frenchAmortizationPlan.find(entry => entry.installmentNumber === installmentNumber);

      generatedInstallments.push({
        number: installmentNumber,
        dueDate,
        amount: Math.ceil(expectedInstallmentAmount), // Use the value from the account record
        isPaid: false,
        paymentDate: null,
        paymentId: null,
        isAnnulled: false,
        installmentVersion: null, // Normal pending
        originalPaymentAmount: undefined,
        // Use planEntry for breakdown details, acknowledging potential inaccuracies
        capitalAtPeriodStart: planEntry ? Math.ceil(planEntry.capitalAtPeriodStart) : undefined,
        amortization: planEntry ? Math.ceil(planEntry.amortization) : undefined,
        interestForPeriod: planEntry ? Math.ceil(planEntry.interestForPeriod) : undefined,
        calculatedInstallmentAmount: Math.ceil(expectedInstallmentAmount), // Reflect the potentially updated amount from account
      });

    }

    // 3. Mostrar el "Original (Anulado)" si un pago normal fue explícitamente anulado en esta sesión
    if (originalPaymentNowAnnulledInSession) {
      generatedInstallments.push({
        number: installmentNumber,
        dueDate,
        amount: Math.ceil(originalPaymentNowAnnulledInSession.amountPaid),
        isPaid: false,
        paymentDate: originalPaymentNowAnnulledInSession.paymentDate ? new Date(originalPaymentNowAnnulledInSession.paymentDate) : null,
        paymentId: originalPaymentNowAnnulledInSession.id,
        isAnnulled: true,
        annulledDate: new Date(),
        installmentVersion: 'Original (Anulado)',
        originalPaymentAmount: Math.ceil(originalPaymentNowAnnulledInSession.amountPaid),
        capitalAtPeriodStart: planEntry?.capitalAtPeriodStart ? Math.ceil(planEntry.capitalAtPeriodStart) : undefined,
        amortization: planEntry?.amortization ? Math.ceil(planEntry.amortization) : undefined,
        interestForPeriod: planEntry?.interestForPeriod ? Math.ceil(planEntry.interestForPeriod) : undefined,
        calculatedInstallmentAmount: planEntry?.calculatedInstallmentAmount ? Math.ceil(planEntry.calculatedInstallmentAmount) : undefined,
      });
    }

    // 4. Añadir asientos D y H explícitamente si existen para esta cuota
    if (dPayment) {
      generatedInstallments.push({
        number: installmentNumber,
        dueDate: dPayment.paymentDate || dueDate,
        amount: Math.ceil(dPayment.amountPaid),
        isPaid: false,
        paymentDate: dPayment.paymentDate ? new Date(dPayment.paymentDate) : null,
        paymentId: dPayment.id,
        isAnnulled: true,
        annulledDate: dPayment.updatedAt,
        installmentVersion: 'D',
        originalPaymentAmount: Math.ceil(dPayment.amountPaid),
        capitalAtPeriodStart: undefined, amortization: undefined, interestForPeriod: undefined, calculatedInstallmentAmount: Math.ceil(dPayment.amountPaid)
      });
    }
    if (hPayment) {
      generatedInstallments.push({
        number: installmentNumber,
        dueDate: hPayment.paymentDate || dueDate,
        amount: Math.ceil(hPayment.amountPaid),
        isPaid: false,
        paymentDate: hPayment.paymentDate ? new Date(hPayment.paymentDate) : null,
        paymentId: hPayment.id,
        isAnnulled: true,
        annulledDate: hPayment.updatedAt,
        installmentVersion: 'H',
        originalPaymentAmount: Math.ceil(hPayment.amountPaid),
        capitalAtPeriodStart: undefined, amortization: undefined, interestForPeriod: undefined, calculatedInstallmentAmount: Math.ceil(hPayment.amountPaid)
      });
    }
  }

  // ... (lógica de ordenamiento y filtrado de duplicados al final de generateInstallments)
  // La lógica de filtrado de duplicados puede necesitar un ajuste para asegurar que la "pendiente pagable"
  // no sea eliminada si existen D/H o "Original (Anulado)"

  const finalInstallments: InstallmentInfo[] = [];
  const processedKeysForSorting = new Set<string>();

  // Prioridad de visualización: Pagado normal -> Original (Anulado) -> D -> H -> Pendiente pagable
  generatedInstallments.sort((a, b) => {
    if (a.number !== b.number) return a.number - b.number;
    const getOrder = (inst: InstallmentInfo) => {
      if (inst.isPaid && !inst.isAnnulled && inst.installmentVersion !== 'Original (Anulado)' && inst.installmentVersion !== 'D' && inst.installmentVersion !== 'H') return 0; // Pagado normal activo
      if (inst.installmentVersion === 'Original (Anulado)') return 1;
      if (inst.installmentVersion === 'D') return 2;
      if (inst.installmentVersion === 'H') return 3;
      if (!inst.isPaid && !inst.installmentVersion) return 4; // Pendiente pagable
      return 5; // Otros casos / Fallback
    };
    return getOrder(a) - getOrder(b);
  });

  for (const inst of generatedInstallments) {
    // Crear una clave única para cada tipo de entrada por número de cuota
    let keySuffix = 'pending-payable'; // Default para la cuota base pagable
    if (inst.isPaid && !inst.isAnnulled && !inst.installmentVersion) keySuffix = 'paid-normal';
    else if (inst.installmentVersion === 'Original (Anulado)') keySuffix = 'original-annulled';
    else if (inst.installmentVersion === 'D') keySuffix = 'd-entry';
    else if (inst.installmentVersion === 'H') keySuffix = 'h-entry';

    const uniqueKey = `${inst.number}-${keySuffix}`;

    if (!processedKeysForSorting.has(uniqueKey)) {
      finalInstallments.push(inst);
      processedKeysForSorting.add(uniqueKey);
    }
  }

  // Re-ordenar una última vez solo por número de cuota después de asegurar la unicidad de tipos por cuota
  // y luego por la prioridad definida en getOrder para la visualización final.
  finalInstallments.sort((a, b) => {
    if (a.number !== b.number) return a.number - b.number;
    const getOrder = (inst: InstallmentInfo) => {
      if (inst.isPaid && !inst.isAnnulled && inst.installmentVersion !== 'Original (Anulado)' && inst.installmentVersion !== 'D' && inst.installmentVersion !== 'H') return 0;
      if (inst.installmentVersion === 'Original (Anulado)') return 1;
      if (inst.installmentVersion === 'D') return 2;
      if (inst.installmentVersion === 'H') return 3;
      if (!inst.isPaid && !inst.installmentVersion && !inst.isAnnulled) return 4; // Pendiente pagable
      return 5;
    };
    return getOrder(a) - getOrder(b);
  });

  return finalInstallments;
};

interface CurrentAccountsTableProps {
  accounts: CurrentAccountWithDetails[];
}

export default function CurrentAccountsTable({ accounts }: CurrentAccountsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [refreshing, setRefreshing] = useState(false);

  // Estado para tracking de accordion abiertos (podría almacenar los IDs)
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  // Estado para el modal de pago
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    accountId: string;
    installmentNumber: number;
    amount: number;
  }>({
    isOpen: false,
    accountId: "",
    installmentNumber: 0,
    amount: 0
  });

  const [annulledPaymentIdsInSession, setAnnulledPaymentIdsInSession] = useState<Set<string>>(new Set());

  const toggleAccordion = (accountId: string) => {
    setExpandedAccounts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  // Función para abrir el modal de pago
  const handlePaymentClick = (e: React.MouseEvent, accountId: string, installmentNumber: number, amount: number) => {
    e.stopPropagation(); // Evitar que se propague al acordeón
    setPaymentModal({
      isOpen: true,
      accountId,
      installmentNumber,
      amount
    });
  };

  // Función para cerrar el modal de pago
  const closePaymentModal = () => {
    setPaymentModal(prev => ({ ...prev, isOpen: false }));
    handleDataRefresh();
  };

  const handleAnnulmentSuccess = (paymentIdToAnnul: string) => {
    setAnnulledPaymentIdsInSession(prev => new Set(prev).add(paymentIdToAnnul));
    handleDataRefresh();
  };

  // Función para refrescar los datos manualmente
  const handleDataRefresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  return (
    <>
      <div className="rounded-md border">
        <div className="flex justify-end p-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDataRefresh}
            disabled={refreshing}
            className="flex gap-1 items-center"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Cliente</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead className="text-right">Monto Total</TableHead>
              <TableHead className="text-right">Pago Inicial</TableHead>
              <TableHead className="text-center">Cuotas</TableHead>
              <TableHead>Frecuencia</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Progreso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => {
              const payments = account.payments || [];

              const actualInstallmentPaymentsAmount = payments
                .filter(p =>
                  p.installmentVersion !== 'D' &&
                  p.installmentVersion !== 'H' &&
                  !(p as any).isDownPayment &&
                  (p.id ? !annulledPaymentIdsInSession.has(p.id) : true) &&
                  p.installmentNumber !== null && p.installmentNumber > 0
                )
                .reduce((sum, payment) => sum + payment.amountPaid, 0);

              const totalEffectivelyPaid = account.downPayment + actualInstallmentPaymentsAmount;

              // Calculate total obligation including interest from French Amortization
              const financialPrincipalForSchedule = account.totalAmount - account.downPayment;
              const amortizationPlanForTotals = (account.interestRate ?? 0) > 0 && financialPrincipalForSchedule > 0
                ? calculateFrenchAmortizationSchedule(
                  financialPrincipalForSchedule,
                  account.interestRate ?? 0,
                  account.numberOfInstallments,
                  account.paymentFrequency as PaymentFrequency
                )
                : calculateFrenchAmortizationSchedule(
                  financialPrincipalForSchedule,
                  0, // No interest
                  account.numberOfInstallments,
                  account.paymentFrequency as PaymentFrequency
                );

              const totalAmountOfAllCalculatedInstallments = amortizationPlanForTotals.reduce((sum, entry) => sum + Math.ceil(entry.calculatedInstallmentAmount), 0);
              const grandTotalObligation = account.downPayment + totalAmountOfAllCalculatedInstallments;

              let uiProgressPercentage = 0;
              if (grandTotalObligation > 0) {
                uiProgressPercentage = Math.min(100, Math.round((totalEffectivelyPaid / grandTotalObligation) * 100));
              } else {
                // If grandTotalObligation is 0 (e.g. price 0, or fully paid by downpayment with no financing)
                if (account.totalAmount <= account.downPayment && account.totalAmount >= 0) {
                  uiProgressPercentage = 100;
                } else {
                  uiProgressPercentage = 0;
                }
              }

              let uiRemainingAmountDisplay = Math.max(0, grandTotalObligation - totalEffectivelyPaid);

              // If the account is marked as PAID_OFF in the database, ensure UI reflects this perfectly.
              if (account.status === "PAID_OFF") {
                uiProgressPercentage = 100;
                uiRemainingAmountDisplay = 0;
              } else {
                // If not PAID_OFF in DB, but our calculation shows it should be (e.g. paid exactly or overpaid slightly)
                // Adjust UI for consistency for progress and remaining amount.
                // The status badge will still reflect the actual DB status.
                if (uiRemainingAmountDisplay <= 0 && totalEffectivelyPaid >= grandTotalObligation) {
                  uiProgressPercentage = 100;
                  uiRemainingAmountDisplay = 0;
                }
              }

              const currentInstallments = generateInstallments(account, annulledPaymentIdsInSession);
              // Note: The original `uiRemainingAmount` and `progressPercentage` that were here are now replaced by `uiRemainingAmountDisplay` and `uiProgressPercentage`

              // DEBUG: Log generated installments for this account
              console.log(`DEBUG (FRONTEND): Installments for account ${account.id}`, currentInstallments);
              // DEBUG: Log account data received by the component
              console.log(`DEBUG (FRONTEND): Account data for ${account.id}`, {
                installmentAmount: account.installmentAmount,
                remainingAmount: account.remainingAmount,
                status: account.status,
                numberOfInstallments: account.numberOfInstallments
              });

              return (
                <React.Fragment key={account.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleAccordion(account.id)}
                  >
                    <TableCell>
                      <div className="h-5 w-5">{expandedAccounts.has(account.id) ? "-" : "+"}</div>
                    </TableCell>
                    <TableCell>
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-2">
                              <User className="h-4 w-4" />
                            </Avatar>
                            <span>
                              {account.client.firstName} {account.client.lastName}
                            </span>
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                          <div className="flex justify-between space-y-1">
                            <h4 className="text-sm font-semibold">Información del Cliente</h4>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm">
                              <span className="font-semibold">ID:</span> {account.client.id}
                            </p>
                            <p className="text-sm">
                              <span className="font-semibold">Nombre completo:</span>{" "}
                              {account.client.firstName} {account.client.lastName}
                            </p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </TableCell>
                    <TableCell>
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-2">
                              <Car className="h-4 w-4" />
                            </Avatar>
                            <span>
                              {account.motorcycle?.model?.name || "N/A"} (
                              {account.motorcycle?.year || "N/A"})
                            </span>
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                          <div className="flex justify-between space-y-1">
                            <h4 className="text-sm font-semibold">Información de la Motocicleta</h4>
                          </div>
                          <div className="space-y-2">
                            {account.motorcycle ? (
                              <>
                                <p className="text-sm">
                                  <span className="font-semibold">Modelo:</span>{" "}
                                  {account.motorcycle.model.name}
                                </p>
                                <p className="text-sm">
                                  <span className="font-semibold">Año:</span>{" "}
                                  {account.motorcycle.year}
                                </p>
                                <p className="text-sm">
                                  <span className="font-semibold">Chasis:</span>{" "}
                                  {account.motorcycle.chassisNumber}
                                </p>
                                <p className="text-sm">
                                  <span className="font-semibold">Motor:</span>{" "}
                                  {account.motorcycle.engineNumber}
                                </p>
                                <p className="text-sm">
                                  <span className="font-semibold">Precio:</span>{" "}
                                  {formatCurrency(account.motorcycle.retailPrice)}
                                </p>
                              </>
                            ) : (
                              <p className="text-sm text-gray-500">No hay datos disponibles</p>
                            )}
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(account.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(account.downPayment)}
                    </TableCell>
                    <TableCell className="text-center">{account.numberOfInstallments}</TableCell>
                    <TableCell>
                      {frequencyMap[account.paymentFrequency] || account.paymentFrequency}
                    </TableCell>
                    <TableCell>{formatDate(account.startDate)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColorMap[account.status]}>
                        {statusTranslations[account.status] || account.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2">
                        <Progress value={uiProgressPercentage} className="h-2 w-16" />
                        <span className="text-xs">{uiProgressPercentage}%</span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Accordion content for installments */}
                  {expandedAccounts.has(account.id) && (
                    <TableRow>
                      <TableCell colSpan={10} className="p-0 border-t-0">
                        <div className="p-4 bg-gray-50">
                          <h3 className="font-medium mb-3">Detalle de Cuotas</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1">
                              <Card>
                                <CardContent className="pt-4">
                                  <dl className="grid grid-cols-2 gap-y-2">
                                    <dt className="text-sm font-medium">Monto Total (c/Int):</dt>
                                    <dd className="text-sm">{formatCurrency(grandTotalObligation)} ({account.currency || 'ARS'})</dd>

                                    <dt className="text-sm font-medium">Pago Inicial:</dt>
                                    <dd className="text-sm">{formatCurrency(account.downPayment)}</dd>

                                    {account.interestRate !== null && account.interestRate !== undefined && (
                                      <>
                                        <dt className="text-sm font-medium">Tasa de Interés:</dt>
                                        <dd className="text-sm">{account.interestRate}%</dd>
                                      </>
                                    )}

                                    <dt className="text-sm font-medium">Monto Financiado:</dt>
                                    <dd className="text-sm">
                                      {formatCurrency(financialPrincipalForSchedule)}
                                    </dd>

                                    <dt className="text-sm font-medium">Monto Pagado:</dt>
                                    <dd className="text-sm">{formatCurrency(totalEffectivelyPaid)}</dd>

                                    <dt className="text-sm font-medium">Saldo Pendiente (c/Int):</dt>
                                    <dd className="text-sm font-semibold">
                                      {formatCurrency(uiRemainingAmountDisplay)}
                                    </dd>
                                  </dl>
                                  <div className="mt-4 pt-4 border-t border-gray-200">
                                    <Link href={`/reports/current-account/${account.id}`} passHref>
                                      <Button variant="outline" size="sm" className="w-full">
                                        <FileText className="mr-2 h-4 w-4" />
                                        Generar Reporte PDF
                                      </Button>
                                    </Link>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>

                            <div className="md:col-span-2 overflow-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-12">N°</TableHead>
                                    <TableHead>Vencimiento</TableHead>
                                    <TableHead className="text-right">Cap. Inicio</TableHead>
                                    <TableHead className="text-right">Amortización</TableHead>
                                    <TableHead className="text-right">Interés</TableHead>
                                    <TableHead className="text-right">Cuota</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="w-28 text-center">Acciones</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {currentInstallments.map((installment) => (
                                    <TableRow key={`${installment.number}-${installment.paymentId || 'pending'}-${installment.installmentVersion || 'original'}-${Math.random()}`}>
                                      <TableCell className="font-medium">{installment.number}{installment.installmentVersion && installment.installmentVersion !== 'Original (Anulado)' ? String(installment.installmentVersion).toUpperCase() : ''}</TableCell>
                                      <TableCell>{formatDate(installment.dueDate)}</TableCell>
                                      <TableCell className="text-right">
                                        {installment.capitalAtPeriodStart !== undefined ? formatCurrency(installment.capitalAtPeriodStart) : '-'}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {installment.amortization !== undefined && installment.installmentVersion !== 'D' && installment.installmentVersion !== 'H' ? formatCurrency(installment.amortization) : '-'}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {installment.interestForPeriod !== undefined && installment.installmentVersion !== 'D' && installment.installmentVersion !== 'H' ? formatCurrency(installment.interestForPeriod) : '-'}
                                      </TableCell>
                                      <TableCell className="text-right font-semibold">
                                        {formatCurrency(
                                          (() => {
                                            const sign = installment.installmentVersion === 'H' ? -1 : 1;
                                            if (installment.installmentVersion === 'D' || installment.installmentVersion === 'H' || installment.installmentVersion === 'Original (Anulado)') {
                                              // For annulment entries, show the amount associated with them
                                              return sign * installment.amount;
                                            } else if (installment.isPaid) {
                                              // If paid normally, show the actual amount paid
                                              return sign * installment.amount;
                                            } else {
                                              // If pending, show the calculated expected amount
                                              return sign * (installment.calculatedInstallmentAmount ?? 0); // Fallback to 0 if undefined
                                            }
                                          })()
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {installment.installmentVersion === 'D' ? (
                                          <Badge className={statusColorMap.ANNULLED || 'bg-orange-100 text-orange-800'}>Anulación (D)</Badge>
                                        ) : installment.installmentVersion === 'H' ? (
                                          <Badge className={statusColorMap.ANNULLED || 'bg-orange-100 text-orange-800'}>Anulación (H)</Badge>
                                        ) : installment.installmentVersion === 'Original (Anulado)' ? (
                                          <Badge className={statusColorMap.ANNULLED || 'bg-orange-100 text-orange-800'}>Pagada (Anulada)</Badge>
                                        ) : installment.isPaid ? (
                                          <Badge className="bg-green-100 text-green-800">
                                            Pagada{installment.paymentDate ? ` el ${formatDate(installment.paymentDate)}` : ''}
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-gray-600">
                                            Pendiente
                                          </Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {(installment.installmentVersion === 'D' || installment.installmentVersion === 'H' || installment.installmentVersion === 'Original (Anulado)') ? null
                                          : installment.isPaid ? (
                                            <AnnulPaymentButton
                                              paymentId={installment.paymentId!}
                                              onAnnulmentSuccess={() => installment.paymentId && handleAnnulmentSuccess(installment.paymentId)}
                                              className="text-xs"
                                              buttonText="Anular"
                                              variant="destructive"
                                            />
                                          ) : (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="text-xs"
                                              onClick={(e) => handlePaymentClick(e, account.id, installment.number, installment.calculatedInstallmentAmount ?? installment.amount)}
                                            >
                                              Pagar
                                            </Button>
                                          )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>

                          {account.notes && (
                            <div className="mt-4 p-3 bg-amber-50 rounded-md flex gap-2">
                              <AlertCircle className="h-5 w-5 text-amber-600" />
                              <p className="text-sm text-amber-800">{account.notes}</p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Pago */}
      {paymentModal.isOpen && (
        <PaymentModal
          isOpen={paymentModal.isOpen}
          onClose={closePaymentModal}
          currentAccountId={paymentModal.accountId}
          defaultAmount={paymentModal.amount}
          installmentNumber={paymentModal.installmentNumber}
        />
      )}
    </>
  );
}
