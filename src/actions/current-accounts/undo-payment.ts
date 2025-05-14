"use server";

import { getOrganizationIdFromSession } from "@/actions/getOrganizationIdFromSession";
import prisma from "@/lib/prisma";
import { type PaymentFrequency, Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";

const undoPaymentSchema = z.object({
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
    annualInterestRatePercent > 0 ? Math.pow(1 + tnaDecimal, 1 / periodsPerYear) - 1 : 0;

  if (remainingAmount <= 0 || remainingInstallments <= 0) return 0;
  if (periodicRate === 0) return Math.ceil(remainingAmount / remainingInstallments);

  const factor = Math.pow(1 + periodicRate, remainingInstallments);
  const raw = (remainingAmount * (periodicRate * factor)) / (factor - 1);
  return Math.ceil(raw);
}

export interface UndoPaymentFormState {
  message: string;
  errors?: {
    paymentId?: string[];
    _form?: string[];
  };
  success: boolean;
}

export async function undoPayment(
  prevState: UndoPaymentFormState,
  formData: FormData,
): Promise<UndoPaymentFormState> {
  const session = await getOrganizationIdFromSession();

  if (!session?.organizationId) {
    return {
      message: "Error: Organization not found or user not authenticated.",
      success: false,
    };
  }
  const organizationId = session.organizationId;
  // const userId = session.userId; // TODO: Extract actual userId for auditing if needed

  const validatedFields = undoPaymentSchema.safeParse({
    paymentId: formData.get("paymentId"),
  });

  if (!validatedFields.success) {
    return {
      message: "Error: Invalid data for undo operation. Payment ID is missing or invalid.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { paymentId } = validatedFields.data;

  try {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const paymentToAnnul = await tx.payment.findUnique({
        where: { id: paymentId, organizationId: organizationId },
        include: {
          currentAccount: true,
        },
      });

      if (!paymentToAnnul) {
        return { message: `Error: Payment with ID ${paymentId} not found.`, success: false };
      }

      if (!paymentToAnnul.currentAccount) {
        return {
          message: `Error: Current account data not found for payment ${paymentId}.`,
          success: false,
        };
      }

      if (paymentToAnnul.installmentVersion === "D" || paymentToAnnul.installmentVersion === "H") {
        return {
          message: `Error: Payment ${paymentId} appears to be part of an annulment process already.`,
          success: false,
        };
      }

      const amountPaidOriginal = paymentToAnnul.amountPaid;
      const currentAccountIdFromPayment = paymentToAnnul.currentAccountId;
      if (!currentAccountIdFromPayment) {
        return {
          message: `Error: currentAccountId is missing on payment ${paymentId}.`,
          success: false,
        };
      }

      // 1. Mark the original payment with version "D" (Debe)
      const paymentD = await tx.payment.update({
        where: { id: paymentId },
        data: {
          installmentVersion: "D",
          updatedAt: new Date(), // Update timestamp
        },
      });

      // 2. Create a new payment with version "H" (Haber) - copy of the original
      const paymentH = await tx.payment.create({
        data: {
          currentAccountId: paymentToAnnul.currentAccountId,
          organizationId: paymentToAnnul.organizationId,
          amountPaid: paymentToAnnul.amountPaid, // Same amount
          paymentDate: paymentToAnnul.paymentDate,
          paymentMethod: paymentToAnnul.paymentMethod,
          notes: paymentToAnnul.notes
            ? `${paymentToAnnul.notes} (Anulación H)`
            : `Asiento H por anulación de pago ${paymentId}`,
          transactionReference: paymentToAnnul.transactionReference,
          installmentNumber: paymentToAnnul.installmentNumber,
          installmentVersion: "H",
          // Ensure all other relevant fields from paymentToAnnul are copied if necessary
          // createdAt will be new, updatedAt will be new by default
        },
      });

      // Create a new pending payment entry for the same installment
      await tx.payment.create({
        data: {
          currentAccountId: paymentToAnnul.currentAccountId,
          organizationId: paymentToAnnul.organizationId,
          amountPaid: paymentToAnnul.amountPaid,
          paymentDate: null, // No payment date since it's pending
          paymentMethod: null, // No payment method yet
          notes: `Cuota pendiente tras anulación de pago ID: ${paymentId}.`,
          transactionReference: null,
          installmentNumber: paymentToAnnul.installmentNumber,
          installmentVersion: null, // Normal payment, no special version
          createdAt: new Date(),
        },
      });

      // 3. Update the CurrentAccount's remainingAmount
      // The net effect of D and H on the balance for THIS specific payment is neutral for accounting display of the payment itself,
      // but the original amountPaid effectively needs to be re-added to the debt.
      const currentAccount = paymentToAnnul.currentAccount;
      const newRemainingAmount = currentAccount.remainingAmount + amountPaidOriginal;

      // 4. Calcular cuántas cuotas se han pagado realmente (excluyendo D/H y anuladas)
      const validPaymentsCount = await tx.payment.count({
        where: {
          currentAccountId: currentAccountIdFromPayment,
          installmentVersion: null, // Solo pagos normales y activos
        },
      });

      // 5. Determinar cuántas cuotas quedan pendientes
      const remainingInstallments = Math.max(
        0,
        currentAccount.numberOfInstallments - validPaymentsCount,
      );

      // 6. Calcular nuevo monto de cuota basado en el saldo restante actualizado
      const updateData: Prisma.CurrentAccountUpdateInput = {
        remainingAmount: newRemainingAmount,
        updatedAt: new Date(),
      };

      if (remainingInstallments > 0) {
        // Calcular nuevo valor para installmentAmount
        const newInstallmentAmount = calculateNewInstallment(
          newRemainingAmount, // El saldo actualizado tras anular el pago
          currentAccount.interestRate ?? 0,
          remainingInstallments,
          currentAccount.paymentFrequency,
        );

        updateData.installmentAmount = newInstallmentAmount;
      }

      // Actualizar la cuenta corriente con los nuevos valores
      await tx.currentAccount.update({
        where: { id: currentAccountIdFromPayment },
        data: updateData,
      });

      console.log(
        `Payment ${paymentId} processed for D/H annulment. Payment D: ${paymentD.id}, Payment H: ${paymentH.id}. Current account ${currentAccountIdFromPayment} updated with new installment amount.`,
      );

      return {
        message: `Anulación procesada para pago ${paymentId} (Asientos D/H generados). Saldo y cuota recalculados.`,
        success: true,
      };
    });
  } catch (error) {
    console.error("Error undoing payment with D/H logic:", error);
    let errorMessage = "Error: Ocurrió un error inesperado al procesar la anulación del pago.";
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      errorMessage = `Error de base de datos al anular el pago (D/H). Código: ${error.code}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      message: errorMessage,
      success: false,
    };
  }
}

export async function fetchImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("No se pudo obtener la imagen");
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  // Intenta deducir el mime-type, por ejemplo 'image/png'
  const mimeType = url.endsWith(".png")
    ? "image/png"
    : url.endsWith(".jpg") || url.endsWith(".jpeg")
      ? "image/jpeg"
      : "image/png";
  return `data:${mimeType};base64,${base64}`;
}
