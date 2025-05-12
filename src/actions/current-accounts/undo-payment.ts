"use server";

import { getOrganizationIdFromSession } from "@/actions/getOrganizationIdFromSession";
import prisma from "@/lib/prisma";
import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";

const undoPaymentSchema = z.object({
  paymentId: z.string().min(1, "Payment ID is required."),
});

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
        return { message: `Error: Current account data not found for payment ${paymentId}.`, success: false };
      }
      
      if (paymentToAnnul.installmentVersion === "D" || paymentToAnnul.installmentVersion === "H") {
        return { message: `Error: Payment ${paymentId} appears to be part of an annulment process already.`, success: false };
      }

      const amountPaidOriginal = paymentToAnnul.amountPaid;
      const currentAccountIdFromPayment = paymentToAnnul.currentAccountId;
      if (!currentAccountIdFromPayment) {
         return { message: `Error: currentAccountId is missing on payment ${paymentId}.`, success: false };
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
          notes: paymentToAnnul.notes ? `${paymentToAnnul.notes} (Anulación H)` : `Asiento H por anulación de pago ${paymentId}`,
          transactionReference: paymentToAnnul.transactionReference,
          installmentNumber: paymentToAnnul.installmentNumber,
          installmentVersion: "H", 
          // Ensure all other relevant fields from paymentToAnnul are copied if necessary
          // createdAt will be new, updatedAt will be new by default
        },
      });

      // 3. Update the CurrentAccount's remainingAmount
      // The net effect of D and H on the balance for THIS specific payment is neutral for accounting display of the payment itself,
      // but the original amountPaid effectively needs to be re-added to the debt.
      const currentAccount = paymentToAnnul.currentAccount;
      const newRemainingAmount = currentAccount.remainingAmount + amountPaidOriginal;

      await tx.currentAccount.update({
        where: { id: currentAccountIdFromPayment },
        data: {
          remainingAmount: newRemainingAmount,
          // Optionally, adjust status if it had become PAID_OFF due to this payment
          // status: currentAccount.status === "PAID_OFF" && newRemainingAmount > 0 ? "ACTIVE" : currentAccount.status,
          // For now, let's keep status update simple or handle it in a more sophisticated way elsewhere if needed.
          updatedAt: new Date(), 
        },
      });

      console.log(`Payment ${paymentId} processed for D/H annulment. Payment D: ${paymentD.id}, Payment H: ${paymentH.id}. Current account ${currentAccountIdFromPayment} updated.`);

      return {
        message: `Anulación procesada para pago ${paymentId} (Asientos D/H generados). Saldo de cuenta corriente actualizado.`,
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