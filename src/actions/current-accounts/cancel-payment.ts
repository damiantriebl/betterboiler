"use server";

import { getOrganizationIdFromSession } from "@/actions/getOrganizationIdFromSession";
import prisma from "@/lib/prisma"; // Importación correcta del cliente Prisma
import { type PaymentFrequency, Prisma } from "@prisma/client";
import { z } from "zod";

const cancelPaymentSchema = z.object({
  paymentId: z.string().min(1, "Payment ID is required."),
});

// Función para calcular el número de períodos por año según la frecuencia de pago
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

// Función para calcular el nuevo monto de cuota en base al saldo restante
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

export interface CancelPaymentFormState {
  message: string;
  errors?: {
    paymentId?: string[];
    _form?: string[];
  };
  success: boolean;
}

export async function cancelPayment(
  prevState: CancelPaymentFormState,
  formData: FormData,
): Promise<CancelPaymentFormState> {
  const session = await getOrganizationIdFromSession();

  if (!session?.organizationId) {
    return {
      message: "Error: User not authenticated or organization not found.",
      success: false,
    };
  }

  const organizationId = session.organizationId;

  const validatedFields = cancelPaymentSchema.safeParse({
    paymentId: formData.get("paymentId"),
  });

  if (!validatedFields.success) {
    return {
      message: "Error: Invalid data.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { paymentId } = validatedFields.data;

  try {
    const originalPayment = await prisma.payment.findUnique({
      where: {
        id: paymentId,
        organizationId: organizationId,
      },
      include: {
        currentAccount: true, // Incluir la cuenta corriente para tener acceso a sus datos
      },
    });

    if (!originalPayment) {
      return {
        message: "Error: Payment not found or access denied.",
        success: false,
      };
    }

    if (originalPayment.installmentVersion === "D" || originalPayment.installmentVersion === "H") {
      return {
        message: "Error: This payment has already been processed for cancellation (D/H).",
        success: false,
      };
    }

    // Ensure there's an installment number to make sense for D/H logic
    if (typeof originalPayment.installmentNumber !== "number") {
      return {
        message:
          "Error: Payment is not associated with a specific installment and cannot be cancelled in this manner.",
        success: false,
      };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark the original payment with version "D" (Debe)
      await tx.payment.update({
        where: { id: originalPayment.id },
        data: { installmentVersion: "D" },
      });

      // 2. Create a new payment with version "H" (Haber)
      await tx.payment.create({
        data: {
          currentAccountId: originalPayment.currentAccountId,
          paymentDate: originalPayment.paymentDate || new Date(), // Use original or new date
          paymentMethod: originalPayment.paymentMethod,
          notes: `Anulación de pago ID: ${originalPayment.id}. Contrapartida contable.`,
          organizationId: originalPayment.organizationId,
          amountPaid: originalPayment.amountPaid,
          transactionReference: originalPayment.transactionReference,
          installmentNumber: originalPayment.installmentNumber,
          installmentVersion: "H",
          createdAt: new Date(), // Explicitly set creation for the new record
        },
      });

      // 3. Create a new pending payment entry
      await tx.payment.create({
        data: {
          currentAccountId: originalPayment.currentAccountId,
          paymentDate: null, // No payment date since it's pending
          paymentMethod: null, // No payment method yet
          notes: `Cuota pendiente tras anulación de pago ID: ${originalPayment.id}.`,
          organizationId: originalPayment.organizationId,
          amountPaid: originalPayment.amountPaid,
          transactionReference: null, // No transaction reference yet
          installmentNumber: originalPayment.installmentNumber,
          installmentVersion: null, // Normal payment, no special version
          createdAt: new Date(),
        },
      });

      // 4. Obtener la cuenta corriente actualizada para recalcular el monto de cuota
      if (!originalPayment.currentAccountId) {
        throw new Error("El pago no tiene una cuenta corriente asociada");
      }

      const currentAccount = await tx.currentAccount.findUnique({
        where: { id: originalPayment.currentAccountId },
      });

      if (!currentAccount) {
        throw new Error("No se encontró la cuenta corriente asociada al pago");
      }

      // 5. Calcular cuántas cuotas se han pagado realmente (excluyendo D/H y anuladas)
      const validPaymentsCount = await tx.payment.count({
        where: {
          currentAccountId: currentAccount.id,
          installmentVersion: null, // Solo pagos normales
        },
      });

      // 6. Determinar cuántas cuotas quedan pendientes
      const remainingInstallments = Math.max(
        0,
        currentAccount.numberOfInstallments - validPaymentsCount,
      );

      if (remainingInstallments > 0) {
        // 7. Calcular nuevo monto de cuota basado en el saldo restante
        const newInstallmentAmount = calculateNewInstallment(
          currentAccount.remainingAmount, // Ya incluye el importe anulado porque lo actualiza automáticamente al crear D/H
          currentAccount.interestRate ?? 0,
          remainingInstallments,
          currentAccount.paymentFrequency,
        );

        // 8. Actualizar la cuenta corriente con el nuevo monto de cuota
        await tx.currentAccount.update({
          where: { id: currentAccount.id },
          data: {
            installmentAmount: newInstallmentAmount,
            // Opcional: actualizar nextDueDate si el pago anulado afecta la fecha de próximo vencimiento
            updatedAt: new Date(),
          },
        });
      }
    });

    return {
      message: `Payment ID: ${paymentId} (Installment: ${originalPayment.installmentNumber}) has been successfully cancelled (D/H entries created). The installment amount has been recalculated.`,
      success: true,
    };
  } catch (error) {
    console.error("Error cancelling payment:", error);
    // Add more specific error handling if needed (e.g., PrismaClientKnownRequestError)
    return {
      message: "Error: An unexpected error occurred while cancelling the payment.",
      success: false,
    };
  }
}
