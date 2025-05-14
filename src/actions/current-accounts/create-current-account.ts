"use server";

import db from "@/lib/prisma";
import type { ActionState } from "@/types/action-states"; // Assuming you have a general ActionState type
import {
  type CreateCurrentAccountInput,
  createCurrentAccountSchema,
} from "@/zod/current-account-schemas";
import {
  type PaymentFrequency,
  Prisma,
  type CurrentAccount as PrismaCurrentAccount,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Helper function to calculate next due date and final payment date
function calculatePaymentDates(
  startDate: Date,
  numberOfInstallments: number,
  frequency: PaymentFrequency,
) {
  const nextDueDate = new Date(startDate);
  let finalPaymentDate = new Date(startDate);

  // Simple calculation, can be made more robust (e.g. handling month ends, specific days)
  for (let i = 0; i < numberOfInstallments; i++) {
    if (i > 0) {
      // For payments after the first one
      switch (frequency) {
        case "WEEKLY":
          finalPaymentDate.setDate(finalPaymentDate.getDate() + 7);
          break;
        case "BIWEEKLY":
          finalPaymentDate.setDate(finalPaymentDate.getDate() + 14);
          break;
        case "MONTHLY":
          finalPaymentDate.setMonth(finalPaymentDate.getMonth() + 1);
          break;
        case "QUARTERLY":
          finalPaymentDate.setMonth(finalPaymentDate.getMonth() + 3);
          break;
        case "ANNUALLY":
          finalPaymentDate.setFullYear(finalPaymentDate.getFullYear() + 1);
          break;
      }
    }
    if (i === 0) {
      // First payment due date is the start date itself or first calculated if installments > 1
      if (numberOfInstallments > 1) {
        switch (frequency) {
          case "WEEKLY":
            nextDueDate.setDate(startDate.getDate() + 7);
            break;
          case "BIWEEKLY":
            nextDueDate.setDate(startDate.getDate() + 14);
            break;
          case "MONTHLY":
            nextDueDate.setMonth(startDate.getMonth() + 1);
            break;
          case "QUARTERLY":
            nextDueDate.setMonth(startDate.getMonth() + 3);
            break;
          case "ANNUALLY":
            nextDueDate.setFullYear(startDate.getFullYear() + 1);
            break;
          default: // if only one installment, next due date might be same as start or null
            nextDueDate.setDate(startDate.getDate()); // or handle as needed
        }
      } else {
        nextDueDate.setDate(startDate.getDate()); // Single installment, due on start date
      }
    }
  }
  // If only one installment, the final payment date is the start date.
  if (numberOfInstallments === 1) {
    finalPaymentDate = new Date(startDate);
  }

  return {
    nextDueDate: numberOfInstallments > 0 ? nextDueDate : null,
    finalPaymentDate: numberOfInstallments > 0 ? finalPaymentDate : null,
  };
}

function getPeriodsPerYear(frequency: string): number {
  const FreqMap = { WEEKLY: 52, BIWEEKLY: 26, MONTHLY: 12, QUARTERLY: 4, ANNUALLY: 1 };
  return FreqMap[frequency as keyof typeof FreqMap] || 12; // Default to monthly
}

function calculateInstallmentWithInterest(
  principal: number,
  annualRateDecimal: number, // ej: 0.30 para 30%
  installments: number,
  paymentFrequency: string,
): number {
  if (principal <= 0 || installments <= 0) return 0;
  if (annualRateDecimal === 0) {
    return principal / installments;
  }

  const periodsPerYear = getPeriodsPerYear(paymentFrequency);
  const ratePerPeriod = annualRateDecimal / periodsPerYear;

  if (ratePerPeriod === 0 && annualRateDecimal !== 0) {
    // Si la tasa anual no es cero pero la tasa por período sí (muchos períodos)
    return principal / installments; // Evitar división por cero si el interés es insignificante por período
  }
  if (ratePerPeriod === -1) {
    // Evita denominador 0 si tasa es -100% por período
    return 0; // O manejar como error
  }

  // Fórmula PMT
  const numerator = principal * ratePerPeriod * (1 + ratePerPeriod) ** installments;
  const denominator = (1 + ratePerPeriod) ** installments - 1;

  if (denominator === 0) {
    // Puede ocurrir si ratePerPeriod es 0 (ya manejado arriba) o problemas de precisión con Math.pow
    return principal / installments; // Fallback
  }
  return numerator / denominator;
}

export async function createCurrentAccount(
  input: CreateCurrentAccountInput,
): Promise<ActionState<PrismaCurrentAccount>> {
  console.log(
    "🔍 [createCurrentAccount] Iniciando creación de cuenta corriente con datos:",
    JSON.stringify(input, null, 2),
  );

  try {
    const validatedInput = createCurrentAccountSchema.safeParse(input);
    if (!validatedInput.success) {
      console.error(
        "❌ [createCurrentAccount] Error en la validación del esquema:",
        validatedInput.error,
      );
      return {
        success: false,
        error: `Error de validación: ${Object.values(validatedInput.error.flatten().fieldErrors).flat().join(", ")}`,
      };
    }

    console.log("✅ [createCurrentAccount] Validación de esquema exitosa");

    const {
      clientId,
      motorcycleId,
      totalAmount,
      downPayment,
      numberOfInstallments,
      installmentAmount,
      paymentFrequency,
      startDate,
      interestRate,
      currency,
      reminderLeadTimeDays,
      status,
      notes,
      organizationId,
    } = validatedInput.data;

    console.log("🔍 [createCurrentAccount] Datos procesados:", {
      clientId,
      motorcycleId,
      totalAmount,
      downPayment,
      organizationId,
      interestRate,
      paymentFrequency,
      numberOfInstallments,
      installmentAmount,
      startDate,
      reminderLeadTimeDays,
      status,
    });

    // Basic check: Ensure client and motorcycle exist (optional, but good practice)
    console.log("🔍 [createCurrentAccount] Verificando existencia del cliente con ID:", clientId);
    const clientExists = await db.client.findUnique({ where: { id: clientId } });
    if (!clientExists) {
      console.error("❌ [createCurrentAccount] Cliente no encontrado:", clientId);
      return { success: false, error: "El cliente especificado no existe." };
    }
    console.log(
      "✅ [createCurrentAccount] Cliente encontrado:",
      clientExists.firstName,
      clientExists.lastName,
    );

    console.log(
      "🔍 [createCurrentAccount] Verificando existencia de la motocicleta con ID:",
      motorcycleId,
    );
    const motorcycleExists = await db.motorcycle.findUnique({ where: { id: motorcycleId } });
    if (!motorcycleExists) {
      console.error("❌ [createCurrentAccount] Motocicleta no encontrada:", motorcycleId);
      return { success: false, error: "La motocicleta especificada no existe." };
    }
    console.log(
      "✅ [createCurrentAccount] Motocicleta encontrada, marca/modelo:",
      motorcycleExists.brandId,
      motorcycleExists.modelId,
    );

    const remainingAmount = totalAmount - downPayment;
    if (remainingAmount < 0) {
      console.error("❌ [createCurrentAccount] Error de pago inicial:", {
        totalAmount,
        downPayment,
        remainingAmount,
      });
      return { success: false, error: "El pago inicial no puede ser mayor que el monto total." };
    }

    // Further validation: (totalAmount - downPayment) should roughly equal (numberOfInstallments * installmentAmount)
    const expectedTotalFromInstallments = numberOfInstallments * installmentAmount;
    if (Math.abs(remainingAmount - expectedTotalFromInstallments) > 0.01) {
      // Allow for small rounding differences
      // This could be a warning or an error depending on business rules
      console.warn(
        "⚠️ [createCurrentAccount] Advertencia: La suma de las cuotas no coincide exactamente con el monto restante a financiar:",
        {
          remainingAmount,
          expectedTotalFromInstallments,
          diff: Math.abs(remainingAmount - expectedTotalFromInstallments),
        },
      );
      // return { success: false, error: "La suma de las cuotas no coincide con el monto a financiar después del pago inicial." };
    }

    const parsedStartDate = new Date(startDate);
    const { nextDueDate, finalPaymentDate } = calculatePaymentDates(
      parsedStartDate,
      numberOfInstallments,
      paymentFrequency,
    );

    console.log("🔍 [createCurrentAccount] Fechas calculadas:", {
      startDate: parsedStartDate,
      nextDueDate,
      finalPaymentDate,
    });

    console.log(
      "🔍 [createCurrentAccount] Intentando crear registro en la base de datos con organizationId:",
      organizationId,
    );
    const newCurrentAccount = await db.currentAccount.create({
      data: {
        clientId,
        motorcycleId,
        totalAmount,
        downPayment,
        remainingAmount,
        numberOfInstallments,
        installmentAmount,
        paymentFrequency,
        startDate: parsedStartDate,
        nextDueDate,
        endDate: finalPaymentDate,
        interestRate,
        currency,
        reminderLeadTimeDays,
        status: status || "ACTIVE", // Default to ACTIVE if not provided
        notes,
        organizationId,
      },
    });

    console.log(
      "✅ [createCurrentAccount] Cuenta corriente creada exitosamente:",
      newCurrentAccount.id,
    );
    revalidatePath("/current-accounts"); // Adjust path as needed
    // Potentially revalidate other paths, e.g., client details page

    return {
      success: true,
      message: "Cuenta corriente creada exitosamente.",
      data: newCurrentAccount,
    };
  } catch (error) {
    console.error("❌ [createCurrentAccount] Error al crear cuenta corriente:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Error de validación: ${Object.values(error.flatten().fieldErrors).flat().join(", ")}`,
      };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle known Prisma errors (e.g., foreign key constraint)
      console.error("❌ [createCurrentAccount] Error de Prisma:", {
        code: error.code,
        meta: error.meta,
        message: error.message,
      });
      return {
        success: false,
        error: `Error de base de datos al crear la cuenta: ${error.message}`,
      };
    }
    return {
      success: false,
      error: `Error desconocido al crear la cuenta corriente: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
