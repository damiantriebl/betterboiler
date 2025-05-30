"use server";

import db from "@/lib/prisma";
import type { ActionState } from "@/types/action-states";
import { type RecordPaymentInput, recordPaymentSchema } from "@/zod/current-account-schemas";
import {
  type Prisma,
  PrismaClient,
  type PaymentFrequency as PrismaPaymentFrequencyType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrganizationIdFromSession } from "../util";

// Use the directly imported type
type PaymentFrequency = PrismaPaymentFrequencyType;

interface AmortizationScheduleEntry {
  installmentNumber: number;
  capitalAtPeriodStart: number;
  interestForPeriod: number;
  amortization: number;
  calculatedInstallmentAmount: number;
  capitalAtPeriodEnd: number;
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
      console.warn(
        `[getPeriodsPerYear] Unknown frequency: ${String(frequency)}, defaulting to 12.`,
      );
      return 12;
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
  const tnaDecimal = annualInterestRatePercent / 100;
  const periodicRate =
    annualInterestRatePercent > 0 ? (1 + tnaDecimal) ** (1 / periodsPerYear) - 1 : 0;

  let currentCapital = principal;
  const schedule: AmortizationScheduleEntry[] = [];

  if (periodicRate === 0) {
    const installmentAmt = Math.ceil(principal / numberOfInstallments);
    for (let i = 1; i <= numberOfInstallments; i++) {
      const amort = i === numberOfInstallments ? currentCapital : installmentAmt;
      schedule.push({
        installmentNumber: i,
        capitalAtPeriodStart: currentCapital,
        interestForPeriod: 0,
        amortization: amort,
        calculatedInstallmentAmount: amort,
        capitalAtPeriodEnd: Math.max(0, currentCapital - amort),
      });
      currentCapital = Math.max(0, currentCapital - amort);
    }
    return schedule;
  }

  const factor = (1 + periodicRate) ** numberOfInstallments;
  const rawPmt = (principal * (periodicRate * factor)) / (factor - 1);
  const fixedInstallment = Math.ceil(rawPmt);

  for (let i = 1; i <= numberOfInstallments; i++) {
    const interest = Math.ceil(currentCapital * periodicRate);
    let amort = fixedInstallment - interest;
    let installmentAmt = fixedInstallment;

    if (i === numberOfInstallments) {
      amort = currentCapital;
      installmentAmt = Math.ceil(currentCapital + interest);
    }

    amort = Math.max(0, Math.min(amort, currentCapital));
    const capitalEnd = Math.max(0, currentCapital - amort);

    schedule.push({
      installmentNumber: i,
      capitalAtPeriodStart: currentCapital,
      interestForPeriod: interest,
      amortization: amort,
      calculatedInstallmentAmount: installmentAmt,
      capitalAtPeriodEnd: capitalEnd,
    });

    currentCapital = capitalEnd;
  }

  return schedule;
}

function calculateNewInstallment(
  remainingAmount: number,
  annualInterestRatePercent: number,
  remainingInstallments: number,
  paymentFrequency: PaymentFrequency,
): number {
  const periodsPerYear = getPeriodsPerYear(paymentFrequency);
  const tnaDecimal = annualInterestRatePercent / 100;
  const periodicRate =
    annualInterestRatePercent > 0 ? (1 + tnaDecimal) ** (1 / periodsPerYear) - 1 : 0;

  if (remainingAmount <= 0 || remainingInstallments <= 0) return 0;
  if (periodicRate === 0) return Math.ceil(remainingAmount / remainingInstallments);

  const factor = (1 + periodicRate) ** remainingInstallments;
  const raw = (remainingAmount * (periodicRate * factor)) / (factor - 1);
  return Math.ceil(raw);
}

function calculateNewNextDueDate(
  accountStartDate: Date,
  paymentFrequency: PaymentFrequency,
  paidCount: number,
  totalInstallments: number,
): Date | null {
  if (paidCount >= totalInstallments) return null;
  const next = new Date(accountStartDate);
  switch (paymentFrequency) {
    case "WEEKLY":
      next.setDate(next.getDate() + 7 * paidCount);
      break;
    case "BIWEEKLY":
      next.setDate(next.getDate() + 14 * paidCount);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + paidCount);
      break;
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3 * paidCount);
      break;
    case "ANNUALLY":
      next.setFullYear(next.getFullYear() + paidCount);
      break;
  }
  return next;
}

export async function recordPayment(
  prevState: ActionState,
  input: RecordPaymentInput,
): Promise<ActionState> {
  try {
    const parsed = recordPaymentSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const errorMessages = Object.values(fieldErrors)
        .flat()
        .filter((msg) => msg !== undefined) as string[];
      const errorMessage = errorMessages[0] || "Error de validación desconocido";
      return { success: false, error: errorMessage };
    }
    const {
      currentAccountId,
      amountPaid,
      paymentDate = new Date().toISOString(),
      paymentMethod,
      transactionReference,
      notes,
      installmentNumber: providedNumber,
      surplusAction,
    } = parsed.data;

    const org = await getOrganizationIdFromSession();
    if (org.error || !org.organizationId) {
      throw new Error(org.error || "No se pudo obtener la organización desde la sesión");
    }

    const account = await db.currentAccount.findUnique({ where: { id: currentAccountId } });
    if (!account) return { success: false, error: "Cuenta no encontrada" };

    const originalPrincipal = account.totalAmount - account.downPayment;
    const originalPlan = calculateFrenchAmortizationSchedule(
      originalPrincipal,
      account.interestRate ?? 0,
      account.numberOfInstallments,
      account.paymentFrequency,
    );

    const paidCount =
      providedNumber != null
        ? providedNumber - 1
        : await db.payment.count({ where: { currentAccountId, installmentVersion: null } });
    const installmentNum = providedNumber ?? paidCount + 1;

    const planEntry = originalPlan.find((e) => e.installmentNumber === installmentNum);
    const principalBefore = planEntry ? planEntry.capitalAtPeriodStart : account.remainingAmount;

    const rate = (account.interestRate ?? 0) / 100 / getPeriodsPerYear(account.paymentFrequency);
    const interestComp = Math.ceil(principalBefore * rate);
    const amortComp = Math.max(0, amountPaid - interestComp);
    const newBalance = Math.max(0, principalBefore - amortComp);

    // Registro pago
    await db.payment.create({
      data: {
        currentAccountId,
        amountPaid,
        paymentDate: new Date(paymentDate),
        paymentMethod,
        transactionReference,
        notes,
        installmentNumber: installmentNum,
        organizationId: org.organizationId,
      },
    });

    // Ajustes por excedente
    const refInstallment = planEntry
      ? planEntry.calculatedInstallmentAmount
      : account.installmentAmount;
    const hasSurplus = amountPaid > refInstallment + 1;

    const updateData: Prisma.CurrentAccountUpdateInput = {
      remainingAmount: newBalance,
      nextDueDate: calculateNewNextDueDate(
        account.startDate,
        account.paymentFrequency,
        paidCount + 1,
        account.numberOfInstallments,
      ),
      status: newBalance <= 0 ? "PAID_OFF" : "ACTIVE",
    };

    if (hasSurplus) {
      if (surplusAction === "RECALCULATE" || !surplusAction) {
        updateData.installmentAmount = calculateNewInstallment(
          newBalance,
          account.interestRate ?? 0,
          account.numberOfInstallments - (paidCount + 1),
          account.paymentFrequency,
        );
      } else if (surplusAction === "REDUCE_INSTALLMENTS") {
        // Mantener installmentAmount y solo ajustar numberOfInstallments
        let simulP = newBalance;
        let count = 0;
        let lastAmt = 0;
        const fixedAmt = account.installmentAmount;
        while (simulP > 0) {
          const interest = Math.ceil(simulP * rate);
          const amort = Math.min(simulP, fixedAmt - interest);
          const due = amort + interest;
          if (amort < simulP) simulP -= amort;
          else {
            lastAmt = due;
            simulP = 0;
          }
          count++;
          if (count > 100) break;
        }
        updateData.numberOfInstallments = paidCount + 1 + count;
        if (lastAmt) {
          updateData.notes = `${account.notes || ""}\n[INFO_ULTIMA_CUOTA] ${JSON.stringify({
            type: "LAST_INSTALLMENT_INFO",
            lastInstallmentAmount: lastAmt,
            originalInstallmentAmount: account.installmentAmount,
            difference: lastAmt - account.installmentAmount,
            calculatedAt: new Date().toISOString(),
          })}`;
        }
      }
    } else {
      updateData.installmentAmount = account.installmentAmount;
    }

    await db.currentAccount.update({ where: { id: currentAccountId }, data: updateData });

    revalidatePath("/current-accounts");
    return { success: true, message: "Pago registrado exitosamente." };
  } catch (err) {
    console.error("recordPayment error", err);
    if (err instanceof z.ZodError) {
      const fieldErrors = err.flatten().fieldErrors;
      const errorMessages = Object.values(fieldErrors)
        .flat()
        .filter((msg) => msg !== undefined) as string[];
      const errorMessage = errorMessages[0] || "Error de validación desconocido";
      return { success: false, error: errorMessage };
    }
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
