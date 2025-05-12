'use server';

import { revalidatePath } from 'next/cache';
import db from '@/lib/prisma';
import type { ActionState } from '@/types/action-states';
import { recordPaymentSchema, type RecordPaymentInput } from '@/zod/current-account-schemas';
import { z } from 'zod';
import { PrismaClient, type PaymentFrequency as PrismaPaymentFrequencyType, Prisma } from '@prisma/client';
import { getOrganizationIdFromSession } from '../getOrganizationIdFromSession';

// Use the directly imported type
type PaymentFrequency = PrismaPaymentFrequencyType;

// Helper function to get periods per year
function getPeriodsPerYear(frequency: PaymentFrequency): number {
  switch (frequency) {
    case 'WEEKLY': return 52;
    case 'BIWEEKLY': return 26;
    case 'MONTHLY': return 12;
    case 'QUARTERLY': return 4;
    case 'ANNUALLY': return 1;
    default:
      // This should ideally not happen if types are correct
      // const _exhaustiveCheck: never = frequency; // May cause issues if PaymentFrequency is a string union from Prisma
      console.warn(`[getPeriodsPerYear] Unknown frequency: ${String(frequency)}, defaulting to 12.`);
      return 12;
  }
}

// New auxiliary function to calculate the next due date
function calculateNewNextDueDate(
  accountStartDate: Date,
  paymentFrequency: PaymentFrequency,
  numberOfInstallmentsNowPaid: number, // Total count of installments considered paid after this transaction
  totalNumberOfInstallmentsInAccount: number
): Date | null {
  const nextInstallmentToPayIndex = numberOfInstallmentsNowPaid; 

  if (nextInstallmentToPayIndex >= totalNumberOfInstallmentsInAccount) {
    return null; 
  }

  const calculatedDueDate = new Date(accountStartDate); 

  switch (paymentFrequency) {
    case 'WEEKLY':
      calculatedDueDate.setDate(new Date(accountStartDate).getDate() + 7 * nextInstallmentToPayIndex);
      break;
    case 'BIWEEKLY':
      calculatedDueDate.setDate(new Date(accountStartDate).getDate() + 14 * nextInstallmentToPayIndex);
      break;
    case 'MONTHLY':
      const monthBaseDate = new Date(accountStartDate);
      monthBaseDate.setMonth(monthBaseDate.getMonth() + nextInstallmentToPayIndex);
      return monthBaseDate;
    case 'QUARTERLY':
      const quarterBaseDate = new Date(accountStartDate);
      quarterBaseDate.setMonth(quarterBaseDate.getMonth() + 3 * nextInstallmentToPayIndex);
      return quarterBaseDate;
    case 'ANNUALLY':
      const annualBaseDate = new Date(accountStartDate);
      annualBaseDate.setFullYear(annualBaseDate.getFullYear() + nextInstallmentToPayIndex);
      return annualBaseDate;
    default:
      const _exhaustiveCheck: never = paymentFrequency; // Ensures all cases are handled
      console.error(`[calculateNewNextDueDate] Unsupported payment frequency: ${_exhaustiveCheck}`);
      return null; 
  }
  return calculatedDueDate; 
}

export async function recordPayment(
  prevState: ActionState,
  input: RecordPaymentInput
): Promise<ActionState> {
  console.log("🔍 [recordPayment] Iniciando registro de pago con datos:", JSON.stringify(input, null, 2));
  console.log("📝 [recordPayment] Previous state:", prevState);
  
  try {
    const validatedInput = recordPaymentSchema.safeParse(input);
    if (!validatedInput.success) {
      console.error("❌ [recordPayment] Error en la validación del esquema:", validatedInput.error);
      return {
        success: false,
        error: "Error de validación: " + Object.values(validatedInput.error.flatten().fieldErrors).flat().join(", "),
      };
    }

    console.log("✅ [recordPayment] Validación de esquema exitosa");

    const { 
      currentAccountId, 
      amountPaid: actualAmountPaid, // Renamed for clarity from here on
      paymentDate = new Date().toISOString(),
      paymentMethod,
      transactionReference,
      notes,
      installmentNumber: providedInstallmentNumber
    } = validatedInput.data;

    const sessionResult = await getOrganizationIdFromSession();
    if (!sessionResult.organizationId) {
      console.error("❌ [recordPayment] Error de sesión:", sessionResult.error);
      return { success: false, error: sessionResult.error || "No se pudo obtener el ID de la organización." };
    }

    const currentAccount = await db.currentAccount.findUnique({
      where: { id: currentAccountId },
    });

    if (!currentAccount) {
      return { success: false, error: "Cuenta corriente no encontrada." };
    }

    let installmentNumberOfThisPayment: number;

    if (providedInstallmentNumber !== undefined && providedInstallmentNumber !== null) {
      // Si el usuario proporciona un número de cuota
      if (providedInstallmentNumber <= 0 || providedInstallmentNumber > currentAccount.numberOfInstallments) {
        return { 
          success: false, 
          error: `Número de cuota inválido. Debe estar entre 1 y ${currentAccount.numberOfInstallments}.` 
        };
      }
      // Verificar si esta cuota específica ya ha sido pagada (y no anulada)
      const existingPaymentForInstallment = await db.payment.findFirst({
        where: {
          currentAccountId,
          installmentNumber: providedInstallmentNumber,
          installmentVersion: null, // Solo pagos válidos, no "D" o "H" directamente
          // Podríamos querer excluir los que tienen installmentVersion "D" o "H"
          // O manejar la lógica de que si existe un "D" y un "H" se puede volver a pagar.
          // Por ahora, un pago simple sin versión D/H para esa cuota la marca como pagada.
        }
      });

      if (existingPaymentForInstallment) {
        // Considerar si se permite pagar parcialmente una cuota ya existente o si esto es un error.
        // Por ahora, asumimos que un pago para una cuota es un pago completo de esa cuota.
        return { 
          success: false, 
          error: `La cuota número ${providedInstallmentNumber} ya ha sido registrada. Para modificarla o anularla, usa las opciones correspondientes.` 
        };
      }
      installmentNumberOfThisPayment = providedInstallmentNumber;
      console.log(`🔢 [recordPayment] Usando número de cuota provisto por el usuario: ${installmentNumberOfThisPayment}`);

    } else {
      // Si el usuario NO proporciona un número de cuota, calcularlo como antes
      const paidInstallmentsCountBeforeThisOne = await db.payment.count({
        where: { 
          currentAccountId,
          installmentVersion: null, // Contar solo pagos efectivos, no contrapartidas D/H
        }
      });
      installmentNumberOfThisPayment = paidInstallmentsCountBeforeThisOne + 1;
      console.log(`🔢 [recordPayment] Calculando número de cuota automáticamente: ${installmentNumberOfThisPayment}`);

      if (installmentNumberOfThisPayment > currentAccount.numberOfInstallments) {
        return { 
          success: false, 
          error: `No se pueden registrar más pagos. Todas las ${currentAccount.numberOfInstallments} cuotas ya han sido cubiertas o superadas.` 
        };
      }
    }

    console.log("Valores antes del cálculo de remanente:", {
        currentAccountRemaining: currentAccount.remainingAmount,
        actualAmountPaidInput: actualAmountPaid, 
        currentAccountInterestRate: currentAccount.interestRate,
        currentAccountPaymentFrequency: currentAccount.paymentFrequency,
        currentAccountInstallmentAmt: currentAccount.installmentAmount,
        currentAccountNumInstallments: currentAccount.numberOfInstallments,
        paymentInstallmentNum: installmentNumberOfThisPayment
    });

    // --- New Interest and Amortization Calculation for the current payment ---
    let interestComponentForThisPayment = 0;
    let amortizationComponentForThisPayment = actualAmountPaid; // Assume full payment goes to principal if no interest

    if (currentAccount.interestRate && currentAccount.interestRate > 0 && currentAccount.remainingAmount > 0) {
        const annualInterestRate = currentAccount.interestRate / 100;
        const periodsPerYear = getPeriodsPerYear(currentAccount.paymentFrequency);
        const periodicInterestRate = annualInterestRate / periodsPerYear;
        
        interestComponentForThisPayment = Math.ceil(currentAccount.remainingAmount * periodicInterestRate);
        
        // If payment doesn't cover interest, amortization is negative (principal increases if interest is capitalized)
        // Or, for simplicity here, we can floor amortization at 0 if payment is less than interest, 
        // meaning interest is not fully paid and principal isn't reduced as much or at all.
        // Let's assume for now that if payment is less than interest, principal reduction is 0 for this payment,
        // and the interest wasn't fully covered.
        // A more advanced system might capitalize unpaid interest.
        amortizationComponentForThisPayment = actualAmountPaid - interestComponentForThisPayment;
    }
    // Ensure amortization isn't negative if we decide not to capitalize interest explicitly here.
    // If actualAmountPaid < interestComponentForThisPayment, amortizationComponent will be negative.
    // This will correctly *increase* remainingAmount if interest is higher than payment.

    console.log("Componentes del pago actual:", {
      interest: interestComponentForThisPayment,
      amortization: amortizationComponentForThisPayment,
    });
    // --- End New Calculation ---

    const updatedRemainingAmountAfterThisPayment = Math.max(0, currentAccount.remainingAmount - amortizationComponentForThisPayment);

    console.log("Valores después del cálculo de componentes:", {
      updatedRemainingAmountAfterThisPayment,
      originalInstallmentAmount: currentAccount.installmentAmount,
    });

    let newCalculatedInstallmentAmount = currentAccount.installmentAmount;
    const remainingInstallmentsToCalculateFor = currentAccount.numberOfInstallments - installmentNumberOfThisPayment;

    if (updatedRemainingAmountAfterThisPayment > 0 && remainingInstallmentsToCalculateFor > 0) {
      if (currentAccount.interestRate && currentAccount.interestRate > 0) {
        const annualInterestRate = currentAccount.interestRate / 100;
        const periodsPerYear = getPeriodsPerYear(currentAccount.paymentFrequency);
        const periodicInterestRate = annualInterestRate / periodsPerYear;

        if (periodicInterestRate > 0) { // Avoid division by zero or issues if rate is zero
          // PMT formula: P * (r * (1 + r)^n) / ((1 + r)^n - 1)
          const P = updatedRemainingAmountAfterThisPayment;
          const r = periodicInterestRate;
          const n = remainingInstallmentsToCalculateFor;
          
          const numerator = r * Math.pow(1 + r, n);
          const denominator = Math.pow(1 + r, n) - 1;

          if (denominator !== 0) { // Avoid division by zero if Math.pow(1 + r, n) is 1
            newCalculatedInstallmentAmount = Math.ceil(P * numerator / denominator);
          } else {
            // This case can happen if r=0 or n=0. If r=0, should go to else block.
            // If n=0, it means no remaining installments, already handled by remainingInstallmentsToCalculateFor > 0
            // If (1+r)^n = 1, this means r=0 or n=0.
            // If r > 0 and n > 0, this means (1+r)^n can't be 1 unless r is complex, which is not our case.
            // Fallback to simple division if something is off, or if rate is very small leading to (1+r)^n approx 1
             newCalculatedInstallmentAmount = Math.ceil(P / n);
          }
        } else { // No interest rate, or periodic rate is zero
           newCalculatedInstallmentAmount = Math.ceil(updatedRemainingAmountAfterThisPayment / remainingInstallmentsToCalculateFor);
        }
      } else { // No interest rate specified on the account
        newCalculatedInstallmentAmount = Math.ceil(updatedRemainingAmountAfterThisPayment / remainingInstallmentsToCalculateFor);
      }
    } else if (updatedRemainingAmountAfterThisPayment <= 0) {
      // If remaining amount is zero or less, future installments should be zero.
      newCalculatedInstallmentAmount = 0;
    }
    // If remainingInstallmentsToCalculateFor <= 0 but updatedRemainingAmountAfterThisPayment > 0,
    // it implies an overpayment beyond the last designated installment, or an error in installmentNumber.
    // In this case, newCalculatedInstallmentAmount retains its previous value or is handled by the logic above.
    // If it's the very last installment, remainingInstallmentsToCalculateFor will be 0,
    // so newCalculatedInstallmentAmount will not be recalculated in the main 'if' block, which is correct.

    console.log("Valores calculados para actualización:", {
      newCalculatedInstallmentAmount,
      finalRemainingAmount: updatedRemainingAmountAfterThisPayment,
    });

    // Registra el pago
    const payment = await db.payment.create({
      data: {
        currentAccountId,
        amountPaid: actualAmountPaid, 
        paymentDate: new Date(paymentDate),
        paymentMethod,
        transactionReference,
        notes,
        organizationId: sessionResult.organizationId,
        installmentNumber: installmentNumberOfThisPayment, 
      },
    });
    console.log("✅ [recordPayment] Pago registrado:", payment.id);

    // Actualiza la cuenta corriente
    // Determine the new count of effectively paid installments
    const paidInstallmentsCountAfterThisOne = await db.payment.count({
        where: {
            currentAccountId,
            installmentVersion: null, // Only count actual payments, not D/H versions
        },
    });

    const newNextDueDate = calculateNewNextDueDate(
      currentAccount.startDate,
      currentAccount.paymentFrequency,
      paidInstallmentsCountAfterThisOne, // Use the total count of paid installments
      currentAccount.numberOfInstallments
    );

    console.log(`🗓️ [recordPayment] Próxima fecha de vencimiento calculada: ${newNextDueDate?.toISOString()}`);


    const dataToUpdate: Prisma.CurrentAccountUpdateInput = {
      remainingAmount: updatedRemainingAmountAfterThisPayment,
      installmentAmount: newCalculatedInstallmentAmount, 
      nextDueDate: newNextDueDate,
    };

    if (updatedRemainingAmountAfterThisPayment <= 0) {
      dataToUpdate.status = 'PAID_OFF';
      console.log("💰 [recordPayment] La cuenta ha sido completamente pagada.");
    } else {
      dataToUpdate.status = 'ACTIVE';
    }

    const updatedAccount = await db.$transaction(async (tx) => {
      // Registra el pago dentro de la transacción
      const payment = await tx.payment.create({
        data: {
          currentAccountId,
          amountPaid: validatedInput.data.amountPaid,  // Use original schema field name
          paymentDate: new Date(paymentDate),
          paymentMethod,
          transactionReference,
          notes,
          organizationId: sessionResult.organizationId,
          installmentNumber: installmentNumberOfThisPayment,
        },
      });

      // Lógica del excedente
      if (actualAmountPaid > currentAccount.installmentAmount) {
        const surplus = actualAmountPaid - currentAccount.installmentAmount;
        
        if (validatedInput.data.surplusAction === 'RECALCULATE') {
          const newInstallmentAmount = calculateNewInstallment(
            currentAccount.remainingAmount - surplus,
            currentAccount.interestRate,
            currentAccount.numberOfInstallments - installmentNumberOfThisPayment
          );
          
          dataToUpdate.remainingAmount = currentAccount.remainingAmount - surplus;
          dataToUpdate.installmentAmount = newInstallmentAmount;
        } else if (validatedInput.data.surplusAction === 'REDUCE_INSTALLMENTS') {
          const reduction = Math.floor(surplus / currentAccount.installmentAmount);
          const newNumberOfInstallments = currentAccount.numberOfInstallments - reduction;
          
          dataToUpdate.numberOfInstallments = newNumberOfInstallments;
          dataToUpdate.remainingAmount = currentAccount.remainingAmount - (currentAccount.installmentAmount * reduction);
        }
      }

      // Actualiza la cuenta dentro de la misma transacción
      return tx.currentAccount.update({
        where: { id: currentAccountId },
        data: dataToUpdate,
      });
    });

    console.log("✅ [recordPayment] Pago registrado exitosamente:", payment.id);
    revalidatePath('/current-accounts');
    
    return {
      success: true,
      message: "Pago registrado exitosamente.",
    };
  } catch (error) {
    console.error("❌ [recordPayment] Error al registrar pago:", error);
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: "Error de validación: " + Object.values(error.flatten().fieldErrors).flat().join(", ") 
      };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("❌ [recordPayment] Error de Prisma:", { code: error.code, meta: error.meta, message: error.message });
      return { success: false, error: "Error de base de datos al registrar el pago: " + error.message };
    }
    return { success: false, error: "Error desconocido al registrar el pago: " + (error instanceof Error ? error.message : String(error)) };
  }
}

// Remove the old calculateNextDueDate function
// // Función auxiliar para calcular la próxima fecha de vencimiento
// function calculateNextDueDate(account: any): Date { ... }

// Agregar esta función antes de recordPayment
function calculateNewInstallment(
  remainingAmount: number,
  annualInterestRate: number,
  remainingInstallments: number
): number {
  const periodsPerYear = 12; // Asumiendo frecuencia mensual
  const periodicRate = annualInterestRate / 100 / periodsPerYear;
  const numerator = periodicRate * Math.pow(1 + periodicRate, remainingInstallments);
  const denominator = Math.pow(1 + periodicRate, remainingInstallments) - 1;
  return Math.ceil(remainingAmount * (numerator / denominator));
}