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

// Interfaz para la entrada de la tabla de amortización (asegúrate que esté definida)
interface AmortizationScheduleEntry {
  installmentNumber: number;
  capitalAtPeriodStart: number;
  interestForPeriod: number;
  amortization: number;
  calculatedInstallmentAmount: number;
  capitalAtPeriodEnd: number;
}

// Mover getPeriodsPerYear aquí si no está ya antes
function getPeriodsPerYear(frequency: PaymentFrequency): number {
  switch (frequency) {
    case 'WEEKLY': return 52;
    case 'BIWEEKLY': return 26;
    case 'MONTHLY': return 12;
    case 'QUARTERLY': return 4;
    case 'ANNUALLY': return 1;
    default:
      console.warn(`[getPeriodsPerYear] Unknown frequency: ${String(frequency)}, defaulting to 12.`);
      return 12;
  }
}

// Mover calculateFrenchAmortizationSchedule aquí
function calculateFrenchAmortizationSchedule(
  principal: number,
  annualInterestRatePercent: number, // Tasa ANUAL en porcentaje, ej. 50 para 50%
  numberOfInstallments: number,
  paymentFrequency: PaymentFrequency
): AmortizationScheduleEntry[] {
  if (principal <= 0 || numberOfInstallments <= 0) return [];
  if (annualInterestRatePercent < 0) return [];

  const periodsPerYear = getPeriodsPerYear(paymentFrequency);
  const tnaDecimal = annualInterestRatePercent / 100; // Convertir TNA a decimal, ej. 0.50

  // Usar tasa efectiva periódica
  const periodicRate = annualInterestRatePercent > 0 ? Math.pow(1 + tnaDecimal, 1 / periodsPerYear) - 1 : 0;
  console.log("[calculateFrenchAmortizationSchedule] TNA: ", annualInterestRatePercent, "%, Periodic Rate (Efectiva): ", periodicRate);
  
  let currentCapital = principal;
  const schedule: AmortizationScheduleEntry[] = [];

  if (periodicRate === 0) {
    const installmentAmt = Math.ceil(principal / numberOfInstallments);
    for (let i = 1; i <= numberOfInstallments; i++) {
      const capitalToAmortize = (i === numberOfInstallments) ? currentCapital : installmentAmt;
      schedule.push({
        installmentNumber: i,
        capitalAtPeriodStart: currentCapital,
        interestForPeriod: 0,
        amortization: Math.ceil(capitalToAmortize),
        calculatedInstallmentAmount: Math.ceil(capitalToAmortize),
        capitalAtPeriodEnd: Math.max(0, currentCapital - capitalToAmortize),
      });
      currentCapital = Math.max(0, currentCapital - capitalToAmortize);
    }
    return schedule;
  }

  const pmtNumerator = periodicRate * Math.pow(1 + periodicRate, numberOfInstallments);
  const pmtDenominator = Math.pow(1 + periodicRate, numberOfInstallments) - 1;
  
  if (pmtDenominator === 0) {
    const installmentAmt = Math.ceil(principal / numberOfInstallments);
     for (let i = 1; i <= numberOfInstallments; i++) {
      const capitalToAmortize = (i === numberOfInstallments) ? currentCapital : installmentAmt;
      schedule.push({
        installmentNumber: i,
        capitalAtPeriodStart: currentCapital,
        interestForPeriod: 0,
        amortization: Math.ceil(capitalToAmortize),
        calculatedInstallmentAmount: Math.ceil(capitalToAmortize),
        capitalAtPeriodEnd: Math.max(0, currentCapital - capitalToAmortize),
      });
      currentCapital = Math.max(0, currentCapital - capitalToAmortize);
    } // Llenar schedule en fallback
    return schedule; 
  }

  const rawPmt = principal * (pmtNumerator / pmtDenominator);
  const fixedInstallment = Math.ceil(rawPmt);

  for (let i = 1; i <= numberOfInstallments; i++) {
    const interest = Math.ceil(currentCapital * periodicRate);
    let amortizationAmount = fixedInstallment - interest;
    let actualInstallmentAmount = fixedInstallment;

    if (i === numberOfInstallments) {
      amortizationAmount = currentCapital;
      actualInstallmentAmount = Math.ceil(currentCapital + interest);
    }

    if (amortizationAmount < 0) amortizationAmount = 0;
    if (currentCapital - amortizationAmount < 0) amortizationAmount = currentCapital;
    
    const capitalAtEnd = Math.max(0, currentCapital - amortizationAmount);

    schedule.push({
      installmentNumber: i,
      capitalAtPeriodStart: currentCapital,
      interestForPeriod: interest,
      amortization: amortizationAmount,
      calculatedInstallmentAmount: actualInstallmentAmount,
      capitalAtPeriodEnd: capitalAtEnd,
    });
    currentCapital = capitalAtEnd;
  }
  return schedule;
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

    // --- Paso 1: Calcular Plan Original (si hay interés) ---
    const financialPrincipal = currentAccount.totalAmount - currentAccount.downPayment;
    const originalAmortizationPlan = (currentAccount.interestRate ?? 0) > 0 && financialPrincipal > 0
      ? calculateFrenchAmortizationSchedule(
          financialPrincipal,
          currentAccount.interestRate ?? 0,
          currentAccount.numberOfInstallments,
          currentAccount.paymentFrequency
        )
      : []; // Plan vacío si no hay interés o principal

    // --- Paso 2: Obtener Capital Inicial del Período Actual ---
    const originalPlanEntry = originalAmortizationPlan.find((e: AmortizationScheduleEntry) => e.installmentNumber === installmentNumberOfThisPayment);
    // Usar capital del plan original. Si no existe (ej. pago más allá de cuotas o plan vacío), usar una aproximación o manejar como error.
    // Por simplicidad, usaremos el 'remainingAmount' actual como fallback si no encontramos la entrada, aunque sabemos que no es ideal.
    const principalBeforePayment = originalPlanEntry ? originalPlanEntry.capitalAtPeriodStart : currentAccount.remainingAmount; 
    console.log(`📈 [DEBUG] Principal antes del pago ${installmentNumberOfThisPayment}: ${principalBeforePayment} (basado en ${originalPlanEntry ? 'plan original' : 'fallback remainingAmount'})`);

    // --- Cálculos básicos --- 
    const annualInterestRate = currentAccount.interestRate ?? 0;
    const periodsPerYear = getPeriodsPerYear(currentAccount.paymentFrequency);
    const periodicInterestRate = annualInterestRate > 0 ? annualInterestRate / 100 / periodsPerYear : 0;

    // --- Paso 3: Calcular Interés Correcto --- 
    const interestComponentForThisPayment = annualInterestRate > 0 ? Math.ceil(principalBeforePayment * periodicInterestRate) : 0;
    console.log(`💲 [DEBUG] Interés calculado para cuota ${installmentNumberOfThisPayment}: ${interestComponentForThisPayment}`);

    // --- Paso 4: Calcular Amortización Correcta ---
    // Si pago es menor que interés, la amortización es negativa (o 0 si no capitalizamos interés)
    // Asumamos que la amortización mínima es 0 y el interés no cubierto se pierde (simplificación)
    let amortizationComponentForThisPayment = Math.max(0, actualAmountPaid - interestComponentForThisPayment);
    console.log(`💸 [DEBUG] Amortización calculada para cuota ${installmentNumberOfThisPayment}: ${amortizationComponentForThisPayment}`);

    // --- Paso 5: Calcular Nuevo Saldo Principal --- 
    const newPrincipalBalance = Math.max(0, principalBeforePayment - amortizationComponentForThisPayment);
    console.log(`🏦 [DEBUG] Nuevo saldo principal calculado (después de amortización normal): ${newPrincipalBalance}`);

    // Registra el pago
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
          organizationId: sessionResult.organizationId!, // Add non-null assertion
          installmentNumber: installmentNumberOfThisPayment,
        },
      });
      console.log("✅ [recordPayment] Pago registrado en transacción:", payment.id);

      // Recalculate next due date *inside* the transaction after payment creation
      const paidInstallmentsCountAfterThisOne = await tx.payment.count({
          where: {
              currentAccountId,
              installmentVersion: null, // Only count actual payments, not D/H versions
          },
      });
  
      const newNextDueDate = calculateNewNextDueDate(
        currentAccount.startDate, // startDate is read before transaction, assumed stable
        currentAccount.paymentFrequency, // frequency is read before transaction, assumed stable
        paidInstallmentsCountAfterThisOne, // Use the count *after* this payment
        currentAccount.numberOfInstallments // numberOfInstallments is read before transaction
      );
      console.log(`🗓️ [recordPayment] Próxima fecha de vencimiento calculada en transacción: ${newNextDueDate?.toISOString()}`);

      // --- Paso 6: Inicializar dataToUpdate con Nuevo Saldo Principal ---
      const dataToUpdate: Prisma.CurrentAccountUpdateInput = {
        remainingAmount: newPrincipalBalance, // GUARDAR EL CAPITAL REAL
        installmentAmount: currentAccount.installmentAmount, // Valor por defecto, puede cambiar con excedente
        nextDueDate: newNextDueDate,
        status: newPrincipalBalance <= 0 ? 'PAID_OFF' : 'ACTIVE',
      };

      if (dataToUpdate.status === 'PAID_OFF') {
           console.log("✔️ [recordPayment] La cuenta queda saldada tras amortización normal.");
      }

      // --- Paso 7: Manejar Excedente ---
      const SURPLUS_TOLERANCE = 1; 
      const calculatedInstallmentForComparison = originalPlanEntry ? originalPlanEntry.calculatedInstallmentAmount : currentAccount.installmentAmount; // Usar cuota del plan si existe
      
      // Comparamos contra la cuota calculada del plan original o la cuota almacenada
      if (actualAmountPaid > calculatedInstallmentForComparison + SURPLUS_TOLERANCE) {
        // El excedente es la diferencia entre lo pagado y la cuota de referencia (del plan original o almacenada)
        const surplusAmountOverReferenceInstallment = actualAmountPaid - calculatedInstallmentForComparison;
        console.log(`💰 [recordPayment] Excedente sobre cuota de referencia detectado (>${SURPLUS_TOLERANCE}): ${surplusAmountOverReferenceInstallment} (Pagado: ${actualAmountPaid}, Cuota ref: ${calculatedInstallmentForComparison})`);
        
        // El newPrincipalBalance YA REFLEJA el capital después de la amortización del pago actual (incluyendo lo que cubre el excedente sobre el interés).
        // Este es el capital que se usará para recalcular las cuotas futuras si se elige esa opción.
        const capitalParaRecalcularFuturasCuotas = newPrincipalBalance; 
        console.log(`🏦 [DEBUG] Capital para recalcular futuras cuotas: ${capitalParaRecalcularFuturasCuotas}`);
        
        const remainingInstallmentsForRecalc = currentAccount.numberOfInstallments - installmentNumberOfThisPayment;

        if (validatedInput.data.surplusAction === 'RECALCULATE' || 
            (validatedInput.data.surplusAction !== 'REDUCE_INSTALLMENTS')) { // Default to RECALCULATE
            
            if (validatedInput.data.surplusAction !== 'RECALCULATE') {
                console.log("🤔 [recordPayment] Excedente detectado sin acción explícita o con acción no reconocida. Por defecto: RECALCULANDO monto de cuota.");
            } else {
                console.log("🔄 [recordPayment] Opción Recalcular seleccionada.");
            }
            
            let newRecalculatedInstallmentAmount = 0;
            if (capitalParaRecalcularFuturasCuotas > 0 && remainingInstallmentsForRecalc > 0) {
                console.log("🧮 [DEBUG] Inputs para calculateNewInstallment:", {
                    principal: capitalParaRecalcularFuturasCuotas,
                    tasaAnual: annualInterestRate,
                    cuotasRestantes: remainingInstallmentsForRecalc,
                    frecuencia: currentAccount.paymentFrequency
                });
                newRecalculatedInstallmentAmount = calculateNewInstallment(
                    capitalParaRecalcularFuturasCuotas,
                    annualInterestRate, 
                    remainingInstallmentsForRecalc,
                    currentAccount.paymentFrequency
                );
                 console.log(`🔢 [recordPayment] Nuevo monto de cuota recalculado: ${newRecalculatedInstallmentAmount}`);
            } else {
                 newRecalculatedInstallmentAmount = 0; 
                 console.log(`📉 [recordPayment] Saldo 0 o sin cuotas restantes. Nueva cuota: 0`);
            }
            dataToUpdate.installmentAmount = newRecalculatedInstallmentAmount;
            dataToUpdate.remainingAmount = capitalParaRecalcularFuturasCuotas; 
            dataToUpdate.status = capitalParaRecalcularFuturasCuotas <= 0 ? 'PAID_OFF' : 'ACTIVE';
            console.log("💾 [DEBUG] dataToUpdate final (RECALCULATE/DEFAULT) antes de guardar:", dataToUpdate);

        } else if (validatedInput.data.surplusAction === 'REDUCE_INSTALLMENTS') {
             console.log("📉 [recordPayment] Opción Reducir Cuotas seleccionada.");
             // El capital restante es newPrincipalBalance. installmentAmount no cambia.
             dataToUpdate.remainingAmount = newPrincipalBalance; 
             dataToUpdate.status = newPrincipalBalance <= 0 ? 'PAID_OFF' : 'ACTIVE';
             console.log("💾 [DEBUG] dataToUpdate final (REDUCE_INSTALLMENTS) antes de guardar:", dataToUpdate);
        }
      } else { // Sin excedente significativo sobre la cuota de referencia
         console.log("✅ [recordPayment] Sin excedente significativo sobre cuota de referencia. Saldo principal según amortización normal.");
         // dataToUpdate.remainingAmount ya es newPrincipalBalance
         // dataToUpdate.installmentAmount ya es currentAccount.installmentAmount
         console.log("💾 [DEBUG] dataToUpdate final (sin excedente) antes de guardar:", dataToUpdate);
      }

      // Actualizar la cuenta
      return tx.currentAccount.update({
        where: { id: currentAccountId },
        data: dataToUpdate,
      });
    });

    // The payment variable might not be accessible here if it was only defined inside the transaction lambda
    // Let's log the updatedAccount instead, or assume logging payment ID isn't critical here
    console.log("✅ [recordPayment] Cuenta actualizada exitosamente:", updatedAccount.id);
    revalidatePath('/current-accounts');

    return {
      success: true,
      message: "Pago registrado exitosamente.",
      // Remove data field if ActionState doesn't expect it
      // data: { ... }
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

// Modify calculateNewInstallment to accept frequency
function calculateNewInstallment(
  remainingAmount: number,
  annualInterestRatePercent: number, // Tasa ANUAL en porcentaje, ej. 50 para 50%
  remainingInstallments: number,
  paymentFrequency: PaymentFrequency 
): number {
  console.log("==> Entrando a calculateNewInstallment con:", { remainingAmount, annualInterestRatePercent, remainingInstallments, paymentFrequency });

  const periodsPerYear = getPeriodsPerYear(paymentFrequency); 
  const tnaDecimal = annualInterestRatePercent / 100; // Convertir TNA a decimal, ej. 0.50
  
  // Usar tasa efectiva periódica
  const periodicRate = annualInterestRatePercent > 0 ? Math.pow(1 + tnaDecimal, 1 / periodsPerYear) - 1 : 0;
  console.log("    periodicRate calculado (Efectiva):", periodicRate, " (periodsPerYear: ", periodsPerYear, ")");
  
  if (remainingAmount <= 0 || remainingInstallments <= 0) {
      console.log("    Retornando 0 (saldo o cuotas <= 0)");
      return 0;
  }
  if (periodicRate === 0) { 
      const result = Math.ceil(remainingAmount / remainingInstallments);
      console.log("    Retornando (sin interés):", result);
      return result;
  }
  
  const factor = Math.pow(1 + periodicRate, remainingInstallments); 
  console.log("    factor (1+r)^n :", factor);
  const numerator = periodicRate * factor;
  console.log("    numerador r*(1+r)^n :", numerator);
  const denominator = factor - 1;
  console.log("    denominador (1+r)^n - 1 :", denominator);
  
  if (denominator === 0) { 
      console.warn("    [calculateNewInstallment] Denominador cero inesperado, usando división simple.");
      const result = Math.ceil(remainingAmount / remainingInstallments);
      console.log("    Retornando (denominador 0):", result);
      return result;
  }
  
  const result = remainingAmount * (numerator / denominator);
  console.log("🧮 [DEBUG] calculateNewInstallment result (antes de ceil):", result);
  const finalResult = Math.ceil(result);
  console.log("==> Saliendo de calculateNewInstallment con:", finalResult);
  return finalResult;
}