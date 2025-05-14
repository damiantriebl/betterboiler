// app/current-accounts/components/CurrentAccountsTable.tsx
"use client";

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
import type { CurrentAccountStatus, Payment, PaymentFrequency } from "@prisma/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertCircle,
  Calendar,
  Car,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  RefreshCw,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import AnnulPaymentButton from "./AnnulPaymentButton";
import PaymentModal from "./PaymentModal";

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
  PENDING: "bg-purple-100 text-purple-800", // Color for pending status
};

// Traducciones para los estados
const statusTranslations: Record<string, string> = {
  ACTIVE: "Activa",
  PAID_OFF: "Pagada",
  OVERDUE: "Vencida",
  DEFAULTED: "Impago",
  CANCELLED: "Cancelada",
  ANNULLED: "Anulada", // New translation
  PENDING: "Pendiente", // Translation for PENDING status
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
  isPending?: boolean; // Added to indicate if payment is in PENDING status
  annulledDate?: Date | null;
  installmentVersion?: string | null;
  originalPaymentAmount?: number; // Monto del pago original (para D/H o si difiere de cuota calculada)

  // Campos del sistema francés
  capitalAtPeriodStart?: number;
  amortization?: number; // Capital pagado en esta cuota
  interestForPeriod?: number; // Interés pagado en esta cuota
  calculatedInstallmentAmount?: number; // Cuota fija según sistema francés
}

function getPeriodsPerYear(frequency: PaymentFrequency): number {
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
      return 12; // Default a mensual
  }
}

function calculateFrenchAmortizationSchedule(
  principal: number,
  annualInterestRatePercent: number,
  numberOfInstallments: number,
  paymentFrequency: PaymentFrequency,
): AmortizationScheduleEntry[] {
  if (principal <= 0 || numberOfInstallments <= 0 || annualInterestRatePercent < 0) return [];

  const periodsPerYear = getPeriodsPerYear(paymentFrequency);
  const i = annualInterestRatePercent / 100 / periodsPerYear;
  let cap = principal;
  const schedule: AmortizationScheduleEntry[] = [];

  if (i <= 0) {
    const c = Math.ceil(principal / numberOfInstallments);
    for (let k = 1; k <= numberOfInstallments; k++) {
      const amort = k === numberOfInstallments ? cap : c;
      schedule.push({
        installmentNumber: k,
        capitalAtPeriodStart: cap,
        interestForPeriod: 0,
        amortization: amort,
        calculatedInstallmentAmount: amort,
        capitalAtPeriodEnd: Math.max(0, cap - amort),
      });
      cap = Math.max(0, cap - amort);
    }
    return schedule;
  }

  const factor = (1 + i) ** numberOfInstallments;
  const raw = (principal * (i * factor)) / (factor - 1);
  const fixed = Math.ceil(raw);

  for (let k = 1; k <= numberOfInstallments; k++) {
    const interest = Math.ceil(cap * i);
    let amort = fixed - interest;
    let instAmt = fixed;

    if (k === numberOfInstallments) {
      instAmt = Math.ceil(cap + interest);
      amort = cap;
    }

    amort = Math.min(Math.max(0, amort), cap);
    const capEnd = Math.max(0, cap - amort);

    schedule.push({
      installmentNumber: k,
      capitalAtPeriodStart: cap,
      interestForPeriod: interest,
      amortization: amort,
      calculatedInstallmentAmount: instAmt,
      capitalAtPeriodEnd: capEnd,
    });

    cap = capEnd;
  }

  return schedule;
}

const generateInstallments = (
  account: CurrentAccountWithDetails,
  annulledPaymentIds: Set<string>,
): InstallmentInfo[] => {
  // Calculamos fecha de vencimiento según frecuencia de pago y número de cuota
  const calculateDueDate = (
    startDate: Date,
    frequency: PaymentFrequency,
    installmentNumber: number,
  ): Date => {
    const dueDate = new Date(startDate);
    const idx = installmentNumber - 1; // Ajustar índice (las cuotas empiezan en 1)

    switch (frequency) {
      case "WEEKLY":
        dueDate.setDate(dueDate.getDate() + 7 * idx);
        break;
      case "BIWEEKLY":
        dueDate.setDate(dueDate.getDate() + 14 * idx);
        break;
      case "MONTHLY":
        dueDate.setMonth(dueDate.getMonth() + idx);
        break;
      case "QUARTERLY":
        dueDate.setMonth(dueDate.getMonth() + 3 * idx);
        break;
      case "ANNUALLY":
        dueDate.setFullYear(dueDate.getFullYear() + idx);
        break;
    }

    return dueDate;
  };

  const financialPrincipal = account.totalAmount - account.downPayment;
  const startDate = new Date(account.startDate);

  // CAMBIO: Filtrar pagos válidos (no anulados, no D/H, no pendientes)
  const validPayments = account.payments.filter(
    (p) =>
      p.installmentVersion !== "D" &&
      p.installmentVersion !== "H" &&
      !annulledPaymentIds.has(p.id || "") &&
      !p.notes?.includes("Cuota pendiente tras anulación"),
  );

  // Obtener pagos por número de cuota (solo los válidos)
  const validPaymentsByInstallment: Record<number, Payment[]> = {};
  for (const payment of validPayments) {
    if (payment.installmentNumber !== null && payment.installmentNumber !== undefined) {
      if (!validPaymentsByInstallment[payment.installmentNumber]) {
        validPaymentsByInstallment[payment.installmentNumber] = [];
      }
      validPaymentsByInstallment[payment.installmentNumber].push(payment);
    }
  }

  // Calcular cuánto se ha pagado efectivamente
  const paidInstallments = Object.keys(validPaymentsByInstallment)
    .map(Number)
    .sort((a, b) => a - b);
  const lastPaidInstallment = paidInstallments.length > 0 ? Math.max(...paidInstallments) : 0;

  // Crear plan de amortización considerando solo los pagos válidos
  let originalPlan: AmortizationScheduleEntry[];

  // Calcular monto total efectivamente pagado (excluyendo pagos anulados y asientos D/H)
  const totalValidPaymentAmount = validPayments.reduce(
    (sum, payment) => sum + payment.amountPaid,
    0,
  );

  // Si no hay pagos válidos (todos fueron anulados) o no hay pagos
  if (totalValidPaymentAmount === 0) {
    // Usar el plan original completo como si nunca se hubiera pagado nada
    originalPlan = calculateFrenchAmortizationSchedule(
      financialPrincipal,
      account.interestRate ?? 0,
      account.numberOfInstallments,
      account.paymentFrequency as PaymentFrequency,
    );
  } else {
    // 1. Calcular el plan original para obtener interés/amortización para cuotas ya pagadas
    originalPlan = calculateFrenchAmortizationSchedule(
      financialPrincipal,
      account.interestRate ?? 0,
      account.numberOfInstallments,
      account.paymentFrequency as PaymentFrequency,
    );

    // 2. Calcular cuántas cuotas se han pagado y cuánto capital se ha amortizado
    const paidCount = Object.keys(validPaymentsByInstallment).length;

    // Suma de amortización real de los pagos válidos
    const capitalAmortizado = validPayments.reduce((sum, p) => {
      if (p.installmentNumber === null) return sum;

      // Obtener el entry del plan original para esta cuota
      const planEntry = originalPlan.find((e) => e.installmentNumber === p.installmentNumber);
      if (!planEntry) return sum;

      // Calcular el interés que se cargó en ese pago
      const periodsPerYear = getPeriodsPerYear(account.paymentFrequency as PaymentFrequency);
      const i = (account.interestRate ?? 0) / 100 / periodsPerYear;
      const interes = Math.ceil(planEntry.capitalAtPeriodStart * i);

      // La amortización es el pago menos el interés
      const amort = p.amountPaid - interes;
      return sum + amort;
    }, 0);

    // 3. Calcular el nuevo capital pendiente
    const nuevoCapitalPendiente = Math.max(0, financialPrincipal - capitalAmortizado);

    // 4. Calcular cuántas cuotas quedan por pagar
    const cuotasRestantes = account.numberOfInstallments - paidCount;

    // 5. Si hay cuotas restantes, calcular un nuevo plan para el capital pendiente
    if (cuotasRestantes > 0 && nuevoCapitalPendiente > 0) {
      const planRestante = calculateFrenchAmortizationSchedule(
        nuevoCapitalPendiente,
        account.interestRate ?? 0,
        cuotasRestantes,
        account.paymentFrequency as PaymentFrequency,
      );

      // 6. Reemplazar las entradas futuras en originalPlan con el nuevo cálculo
      for (let i = paidCount + 1; i <= account.numberOfInstallments; i++) {
        const idx = i - paidCount - 1;
        if (idx >= 0 && idx < planRestante.length) {
          // Reemplazar la entrada en originalPlan con la del nuevo plan
          const originalIdx = originalPlan.findIndex((entry) => entry.installmentNumber === i);
          if (originalIdx !== -1) {
            // Preservar el número de cuota pero usar los nuevos montos
            originalPlan[originalIdx] = {
              ...planRestante[idx],
              installmentNumber: i,
            };
          }
        }
      }
    }
  }

  // 2. Organizar pagos y encontrar cuántos están activos
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

  // Definir funciones auxiliares para verificar tipos de pagos
  const isDHVersion = (p: Payment) =>
    p?.installmentVersion === "D" || p?.installmentVersion === "H";
  const isPendingByAnnul = (p: Payment) => p?.notes?.includes("Cuota pendiente tras anulación");

  // Encontrar pagos activos (no anulados y sin versiones D/H)
  const activePayments = account.payments.filter(
    (p) =>
      p.installmentVersion === null &&
      !isPendingByAnnul(p) &&
      (p.id ? !annulledPaymentIds.has(p.id) : true),
  );

  // Identificar pagos pendientes (con notas que indican que son por anulación)
  const pendingPayments = account.payments.filter(
    (p) => p.installmentVersion === null && p.notes?.includes("Cuota pendiente tras anulación"),
  );

  // Mapear números de cuota con pagos pendientes para fácil búsqueda
  const pendingInstallmentNumbers = new Set(
    pendingPayments.filter((p) => p.installmentNumber !== null).map((p) => p.installmentNumber),
  );

  // 3. Generar resultados finales
  const generatedInstallments: InstallmentInfo[] = [];

  // 4. Verificar si hay información de última cuota parcial
  let lastInstallmentInfo: LastInstallmentInfo | null = null;
  if (account.notes) {
    const match = account.notes.match(/\[INFO_ULTIMA_CUOTA\]\s*([\s\S]*?\})/);
    if (match?.[1]) {
      try {
        lastInstallmentInfo = JSON.parse(match[1]);
      } catch (err) {
        console.error("Error parsing last installment info:", err);
      }
    }
  }

  // 5. Procesar cada número de cuota
  for (let i = 1; i <= account.numberOfInstallments; i++) {
    const dueDate = calculateDueDate(startDate, account.paymentFrequency as PaymentFrequency, i);
    const planEntry = originalPlan.find((entry) => entry.installmentNumber === i);
    const paymentsForInstallment = paymentsByInstallmentNumber[i] || [];

    // Verificar si hay un pago pendiente para esta cuota
    const isPendingInstallment = pendingInstallmentNumbers.has(i);
    const pendingPayment = paymentsForInstallment.find(
      (p) => p.installmentVersion === null && p.notes?.includes("Cuota pendiente tras anulación"),
    );

    // Buscar pagos específicos para esta cuota
    const normalPayment = paymentsForInstallment.find(
      (p) =>
        p.installmentVersion !== "D" &&
        p.installmentVersion !== "H" &&
        !p.notes?.includes("Cuota pendiente tras anulación") &&
        (p.id ? !annulledPaymentIds.has(p.id) : true),
    );

    const dPayment = paymentsForInstallment.find((p) => p.installmentVersion === "D");
    const hPayment = paymentsForInstallment.find((p) => p.installmentVersion === "H");

    const originalPaymentNowAnnulled = paymentsForInstallment.find(
      (p) =>
        p.installmentVersion !== "D" &&
        p.installmentVersion !== "H" &&
        (p.id ? annulledPaymentIds.has(p.id) : false),
    );

    const isEffectivelyPaid = !!normalPayment;
    // Modificamos esta variable para que solo incluya los asientos D/H y pagos anulados originales,
    // pero NO los pagos pendientes nuevos creados tras anulación
    const isUnderAnnulmentProcess = !!dPayment || !!hPayment || !!originalPaymentNowAnnulled;

    // Verificar si es la última cuota con información especial
    let expectedInstallmentAmount =
      planEntry?.calculatedInstallmentAmount ?? account.installmentAmount;
    let isSpecialLastInstallment = false;

    if (i === account.numberOfInstallments && lastInstallmentInfo) {
      if (
        lastInstallmentInfo.type === "LAST_INSTALLMENT_INFO" &&
        lastInstallmentInfo.lastInstallmentNumber === account.numberOfInstallments &&
        typeof lastInstallmentInfo.lastInstallmentAmount === "number" &&
        lastInstallmentInfo.lastInstallmentAmount > 0
      ) {
        expectedInstallmentAmount = lastInstallmentInfo.lastInstallmentAmount;
        isSpecialLastInstallment = true;
        console.log(
          `📊 [DEBUG] Usando monto especial para última cuota #${i}: ${expectedInstallmentAmount}`,
        );
      }
    }

    // Ajustar desglose para cuota especial si es necesario
    let adjustedInterestForPeriod = planEntry ? planEntry.interestForPeriod : undefined;
    let adjustedAmortization = planEntry ? planEntry.amortization : undefined;

    if (isSpecialLastInstallment && planEntry && planEntry.capitalAtPeriodStart) {
      const periodsPerYear = getPeriodsPerYear(account.paymentFrequency as PaymentFrequency);
      const periodicRate = (account.interestRate ?? 0) / 100 / periodsPerYear;
      const calculatedInterest = Math.ceil(planEntry.capitalAtPeriodStart * periodicRate);

      // Respetamos el valor especial de lastInstallmentAmount sin forzar que sea al menos capital+interés
      console.log(
        `📊 [DEBUG] Última cuota especial #${i}: ${expectedInstallmentAmount} (capital pendiente: ${planEntry.capitalAtPeriodStart}, interés: ${calculatedInterest})`,
      );

      adjustedInterestForPeriod = calculatedInterest;
      adjustedAmortization = Math.min(
        planEntry.capitalAtPeriodStart,
        expectedInstallmentAmount - calculatedInterest,
      );
    }

    // 1. Añadir pagos efectivos
    if (isEffectivelyPaid) {
      generatedInstallments.push({
        number: i,
        dueDate,
        amount: Math.ceil(normalPayment.amountPaid),
        isPaid: true,
        isPending: false,
        paymentDate: normalPayment.paymentDate ? new Date(normalPayment.paymentDate) : null,
        paymentId: normalPayment.id,
        isAnnulled: false,
        installmentVersion: normalPayment.installmentVersion || null,
        originalPaymentAmount: Math.ceil(normalPayment.amountPaid),
        capitalAtPeriodStart: planEntry?.capitalAtPeriodStart
          ? Math.ceil(planEntry.capitalAtPeriodStart)
          : undefined,
        amortization: planEntry?.amortization ? Math.ceil(planEntry.amortization) : undefined,
        interestForPeriod: planEntry?.interestForPeriod
          ? Math.ceil(planEntry.interestForPeriod)
          : undefined,
        calculatedInstallmentAmount: planEntry?.calculatedInstallmentAmount
          ? Math.ceil(planEntry.calculatedInstallmentAmount)
          : Math.ceil(normalPayment.amountPaid),
      });
    }

    // 2. Añadir pagos pendientes (especialmente los generados por anulación)
    else if (isPendingInstallment && pendingPayment) {
      generatedInstallments.push({
        number: i,
        dueDate,
        amount: planEntry
          ? Math.ceil(planEntry.calculatedInstallmentAmount)
          : Math.ceil(pendingPayment.amountPaid),
        isPaid: false,
        isPending: true,
        paymentDate: null,
        paymentId: pendingPayment.id,
        isAnnulled: false,
        installmentVersion: null,
        originalPaymentAmount: undefined,
        capitalAtPeriodStart: planEntry ? Math.ceil(planEntry.capitalAtPeriodStart) : undefined,
        amortization: isSpecialLastInstallment
          ? adjustedAmortization
          : planEntry
            ? Math.ceil(planEntry.amortization)
            : undefined,
        interestForPeriod: isSpecialLastInstallment
          ? adjustedInterestForPeriod
          : planEntry
            ? Math.ceil(planEntry.interestForPeriod)
            : undefined,
        calculatedInstallmentAmount: planEntry
          ? Math.ceil(planEntry.calculatedInstallmentAmount)
          : Math.ceil(pendingPayment.amountPaid),
      });
    }
    // 3. Añadir cuotas nunca pagadas (y que no están en proceso de anulación)
    else if (!isEffectivelyPaid && !isUnderAnnulmentProcess) {
      generatedInstallments.push({
        number: i,
        dueDate,
        amount: planEntry
          ? Math.ceil(planEntry.calculatedInstallmentAmount)
          : Math.ceil(expectedInstallmentAmount),
        isPaid: false,
        isPending: false,
        paymentDate: null,
        paymentId: null,
        isAnnulled: false,
        installmentVersion: null,
        originalPaymentAmount: undefined,
        capitalAtPeriodStart: planEntry ? Math.ceil(planEntry.capitalAtPeriodStart) : undefined,
        amortization: isSpecialLastInstallment
          ? adjustedAmortization
          : planEntry
            ? Math.ceil(planEntry.amortization)
            : undefined,
        interestForPeriod: isSpecialLastInstallment
          ? adjustedInterestForPeriod
          : planEntry
            ? Math.ceil(planEntry.interestForPeriod)
            : undefined,
        calculatedInstallmentAmount: planEntry
          ? Math.ceil(planEntry.calculatedInstallmentAmount)
          : Math.ceil(expectedInstallmentAmount),
      });
    }

    // 3. Añadir pagos anulados en esta sesión
    if (originalPaymentNowAnnulled) {
      generatedInstallments.push({
        number: i,
        dueDate,
        amount: Math.ceil(originalPaymentNowAnnulled.amountPaid),
        isPaid: false,
        paymentDate: originalPaymentNowAnnulled.paymentDate
          ? new Date(originalPaymentNowAnnulled.paymentDate)
          : null,
        paymentId: originalPaymentNowAnnulled.id,
        isAnnulled: true,
        annulledDate: new Date(),
        installmentVersion: "Original (Anulado)",
        originalPaymentAmount: Math.ceil(originalPaymentNowAnnulled.amountPaid),
        capitalAtPeriodStart: planEntry?.capitalAtPeriodStart
          ? Math.ceil(planEntry.capitalAtPeriodStart)
          : undefined,
        amortization: planEntry?.amortization ? Math.ceil(planEntry.amortization) : undefined,
        interestForPeriod: planEntry?.interestForPeriod
          ? Math.ceil(planEntry.interestForPeriod)
          : undefined,
        calculatedInstallmentAmount: planEntry?.calculatedInstallmentAmount
          ? Math.ceil(planEntry.calculatedInstallmentAmount)
          : undefined,
      });
    }

    // 4. Añadir asientos D y H
    if (dPayment) {
      generatedInstallments.push({
        number: i,
        dueDate: dPayment.paymentDate ? new Date(dPayment.paymentDate) : dueDate,
        amount: Math.ceil(dPayment.amountPaid),
        isPaid: false,
        paymentDate: dPayment.paymentDate ? new Date(dPayment.paymentDate) : null,
        paymentId: dPayment.id,
        isAnnulled: true,
        annulledDate: dPayment.updatedAt,
        installmentVersion: "D",
        originalPaymentAmount: Math.ceil(dPayment.amountPaid),
        calculatedInstallmentAmount: Math.ceil(dPayment.amountPaid),
      });
    }

    if (hPayment) {
      generatedInstallments.push({
        number: i,
        dueDate: hPayment.paymentDate ? new Date(hPayment.paymentDate) : dueDate,
        amount: Math.ceil(hPayment.amountPaid),
        isPaid: false,
        paymentDate: hPayment.paymentDate ? new Date(hPayment.paymentDate) : null,
        paymentId: hPayment.id,
        isAnnulled: true,
        annulledDate: hPayment.updatedAt,
        installmentVersion: "H",
        originalPaymentAmount: Math.ceil(hPayment.amountPaid),
        calculatedInstallmentAmount: Math.ceil(hPayment.amountPaid),
      });
    }
  }

  // Ordenamiento final según prioridades
  generatedInstallments.sort((a, b) => {
    if (a.number !== b.number) return a.number - b.number;

    const getOrder = (inst: InstallmentInfo) => {
      if (
        inst.isPaid &&
        !inst.isAnnulled &&
        inst.installmentVersion !== "Original (Anulado)" &&
        inst.installmentVersion !== "D" &&
        inst.installmentVersion !== "H"
      )
        return 0; // Pagado normal activo
      if (inst.installmentVersion === "Original (Anulado)") return 1;
      if (inst.installmentVersion === "D") return 2;
      if (inst.installmentVersion === "H") return 3;
      if (!inst.isPaid && !inst.installmentVersion) return 4; // Pendiente pagable
      return 5; // Otros casos
    };

    return getOrder(a) - getOrder(b);
  });

  // Eliminar duplicados manteniendo un solo tipo por número de cuota
  const finalInstallments: InstallmentInfo[] = [];
  const processedKeys = new Set<string>();

  for (const inst of generatedInstallments) {
    let keySuffix = "pending-payable";
    if (inst.isPaid && !inst.isAnnulled && !inst.installmentVersion) keySuffix = "paid-normal";
    else if (inst.installmentVersion === "Original (Anulado)") keySuffix = "original-annulled";
    else if (inst.installmentVersion === "D") keySuffix = "d-entry";
    else if (inst.installmentVersion === "H") keySuffix = "h-entry";

    const uniqueKey = `${inst.number}-${keySuffix}`;

    if (!processedKeys.has(uniqueKey)) {
      finalInstallments.push(inst);
      processedKeys.add(uniqueKey);
    }
  }

  // Reordenar de nuevo para asegurar el orden correcto
  finalInstallments.sort((a, b) => {
    if (a.number !== b.number) return a.number - b.number;

    const getOrder = (inst: InstallmentInfo) => {
      if (
        inst.isPaid &&
        !inst.isAnnulled &&
        inst.installmentVersion !== "Original (Anulado)" &&
        inst.installmentVersion !== "D" &&
        inst.installmentVersion !== "H"
      )
        return 0;
      if (inst.installmentVersion === "Original (Anulado)") return 1;
      if (inst.installmentVersion === "D") return 2;
      if (inst.installmentVersion === "H") return 3;
      if (!inst.isPaid && !inst.installmentVersion && !inst.isAnnulled) return 4;
      return 5;
    };

    return getOrder(a) - getOrder(b);
  });

  return finalInstallments;
};

interface ExtendedPayment extends Payment {
  installmentVersion?: string;
  notes?: string;
  isDownPayment?: boolean;
}

interface LastInstallmentInfo {
  amount: number;
  date: string;
  status: string;
  notes?: string;
}

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
    amount: 0,
  });

  const [annulledPaymentIdsInSession, setAnnulledPaymentIdsInSession] = useState<Set<string>>(
    new Set(),
  );

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
  const handlePaymentClick = (
    e: React.MouseEvent,
    accountId: string,
    installmentNumber: number,
    amount: number,
  ) => {
    e.stopPropagation(); // Evitar que se propague al acordeón
    setPaymentModal({
      isOpen: true,
      accountId,
      installmentNumber,
      amount,
    });
  };

  // Función para cerrar el modal de pago
  const closePaymentModal = () => {
    setPaymentModal((prev) => ({ ...prev, isOpen: false }));
    handleDataRefresh();
  };

  const handleAnnulmentSuccess = (paymentIdToAnnul: string) => {
    setAnnulledPaymentIdsInSession((prev) => new Set(prev).add(paymentIdToAnnul));
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
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Actualizando..." : "Actualizar"}
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
                .filter(
                  (p: ExtendedPayment) =>
                    p.installmentVersion !== "D" &&
                    p.installmentVersion !== "H" &&
                    !p.isDownPayment &&
                    (p.id ? !annulledPaymentIdsInSession.has(p.id) : true) &&
                    p.installmentNumber !== null &&
                    p.installmentNumber > 0,
                )
                .reduce((sum, payment) => sum + payment.amountPaid, 0);

              const totalEffectivelyPaid = account.downPayment + actualInstallmentPaymentsAmount;

              // Calculate total obligation including interest from French Amortization
              const financialPrincipalForSchedule = account.totalAmount - account.downPayment;
              const amortizationPlanForTotals =
                (account.interestRate ?? 0) > 0 && financialPrincipalForSchedule > 0
                  ? calculateFrenchAmortizationSchedule(
                      financialPrincipalForSchedule,
                      account.interestRate ?? 0,
                      account.numberOfInstallments,
                      account.paymentFrequency as PaymentFrequency,
                    )
                  : calculateFrenchAmortizationSchedule(
                      financialPrincipalForSchedule,
                      0, // No interest
                      account.numberOfInstallments,
                      account.paymentFrequency as PaymentFrequency,
                    );

              // Obtener las cuotas generadas incluyendo pagos realizados
              const currentInstallments = generateInstallments(
                account,
                annulledPaymentIdsInSession,
              );

              // Calcular el saldo pendiente real sumando solo las cuotas pendientes (no pagadas)
              const remainingInstallments = currentInstallments.filter(
                (installment) =>
                  !installment.isPaid &&
                  !installment.isAnnulled &&
                  installment.installmentVersion !== "D" &&
                  installment.installmentVersion !== "H",
              );

              const pendingCapitalAndInterest = remainingInstallments.reduce((sum, installment) => {
                // Para cada cuota pendiente, sumar su valor calculado
                const installmentAmount = installment.calculatedInstallmentAmount ?? 0;
                return sum + installmentAmount;
              }, 0);

              // Usar el valor calculado como saldo pendiente real
              let uiRemainingAmountDisplay = Math.max(0, pendingCapitalAndInterest);

              // Calcular el porcentaje de progreso basado en cuánto se ha pagado versus el total
              const grandTotalObligation =
                account.downPayment +
                currentInstallments.reduce((sum, installment) => {
                  if (installment.isPaid) {
                    return sum + installment.amount;
                  }
                  return sum + (installment.calculatedInstallmentAmount ?? 0);
                }, 0);

              let uiProgressPercentage = 0;
              if (grandTotalObligation > 0) {
                uiProgressPercentage = Math.min(
                  100,
                  Math.round((totalEffectivelyPaid / grandTotalObligation) * 100),
                );
              } else {
                if (account.totalAmount <= account.downPayment && account.totalAmount >= 0) {
                  uiProgressPercentage = 100;
                } else {
                  uiProgressPercentage = 0;
                }
              }

              // If the account is marked as PAID_OFF in the database, ensure UI reflects this perfectly.
              if (account.status === "PAID_OFF") {
                uiProgressPercentage = 100;
                uiRemainingAmountDisplay = 0;
              }

              // DEBUG: Log generated installments for this account
              console.log(
                `DEBUG (FRONTEND): Installments for account ${account.id}`,
                currentInstallments,
              );
              // DEBUG: Log account data received by the component
              console.log(`DEBUG (FRONTEND): Account data for ${account.id}`, {
                installmentAmount: account.installmentAmount,
                remainingAmount: account.remainingAmount,
                status: account.status,
                numberOfInstallments: account.numberOfInstallments,
                // Agregar cálculos para depuración
                calculatedRemainingAmount: uiRemainingAmountDisplay,
                pendingInstallments: remainingInstallments.length,
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
                                    <dd className="text-sm">
                                      {formatCurrency(grandTotalObligation)} (
                                      {account.currency || "ARS"})
                                    </dd>

                                    <dt className="text-sm font-medium">Pago Inicial:</dt>
                                    <dd className="text-sm">
                                      {formatCurrency(account.downPayment)}
                                    </dd>

                                    {account.interestRate !== null &&
                                      account.interestRate !== undefined && (
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
                                    <dd className="text-sm">
                                      {formatCurrency(totalEffectivelyPaid)}
                                    </dd>

                                    <dt className="text-sm font-medium">
                                      Saldo Pendiente (c/Int):
                                    </dt>
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
                                    <TableRow
                                      key={`${installment.number}-${installment.paymentId || "pending"}-${installment.installmentVersion || "original"}-${Math.random()}`}
                                    >
                                      <TableCell className="font-medium">
                                        {installment.number}
                                        {installment.installmentVersion &&
                                        installment.installmentVersion !== "Original (Anulado)"
                                          ? String(installment.installmentVersion).toUpperCase()
                                          : ""}
                                      </TableCell>
                                      <TableCell>{formatDate(installment.dueDate)}</TableCell>
                                      <TableCell className="text-right">
                                        {installment.capitalAtPeriodStart !== undefined
                                          ? formatCurrency(installment.capitalAtPeriodStart)
                                          : "-"}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {installment.amortization !== undefined
                                          ? formatCurrency(installment.amortization)
                                          : "-"}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {installment.interestForPeriod !== undefined
                                          ? formatCurrency(installment.interestForPeriod)
                                          : "-"}
                                      </TableCell>
                                      <TableCell className="text-right font-semibold">
                                        {formatCurrency(
                                          (() => {
                                            const sign =
                                              installment.installmentVersion === "H" ? -1 : 1;
                                            if (installment.isAnnulment) {
                                              return sign * installment.amount;
                                            }
                                            if (installment.isPaid) {
                                              return sign * installment.amount;
                                            }
                                            return (
                                              sign * (installment.calculatedInstallmentAmount ?? 0)
                                            );
                                          })(),
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {installment.installmentVersion === "D" ? (
                                          <Badge
                                            className={
                                              statusColorMap.ANNULLED ||
                                              "bg-orange-100 text-orange-800"
                                            }
                                          >
                                            Anulación (D)
                                          </Badge>
                                        ) : installment.installmentVersion === "H" ? (
                                          <Badge
                                            className={
                                              statusColorMap.ANNULLED ||
                                              "bg-orange-100 text-orange-800"
                                            }
                                          >
                                            Anulación (H)
                                          </Badge>
                                        ) : installment.installmentVersion ===
                                          "Original (Anulado)" ? (
                                          <Badge
                                            className={
                                              statusColorMap.ANNULLED ||
                                              "bg-orange-100 text-orange-800"
                                            }
                                          >
                                            Pagada (Anulada)
                                          </Badge>
                                        ) : installment.isPaid ? (
                                          <Badge className="bg-green-100 text-green-800">
                                            Pagada
                                            {installment.paymentDate
                                              ? ` el ${formatDate(installment.paymentDate)}`
                                              : ""}
                                          </Badge>
                                        ) : installment.isPending ? (
                                          <Badge className={statusColorMap.PENDING}>
                                            Pendiente
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-gray-600">
                                            Sin pagar
                                          </Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {installment.installmentVersion === "D" ||
                                        installment.installmentVersion === "H" ||
                                        installment.installmentVersion ===
                                          "Original (Anulado)" ? null : installment.isPaid &&
                                          installment.paymentId ? (
                                          <AnnulPaymentButton
                                            paymentId={installment.paymentId}
                                            onAnnulmentSuccess={() =>
                                              installment.paymentId &&
                                              handleAnnulmentSuccess(installment.paymentId)
                                            }
                                            className="text-xs"
                                            buttonText="Anular"
                                            variant="destructive"
                                          />
                                        ) : (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs"
                                            onClick={(e) =>
                                              handlePaymentClick(
                                                e,
                                                account.id,
                                                installment.number,
                                                installment.calculatedInstallmentAmount ??
                                                  installment.amount,
                                              )
                                            }
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
