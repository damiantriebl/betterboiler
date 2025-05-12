"use server";

import { getOrganizationIdFromSession } from "@/actions/getOrganizationIdFromSession";
import { db } from "@/lib/db"; // Assuming this is your Prisma client instance
import { z } from "zod";
import { PrismaClient } from '@prisma/client'; // O el tipo correcto para tu instancia de Prisma tx

const cancelPaymentSchema = z.object({
  paymentId: z.string().min(1, "Payment ID is required."),
});

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
  const organizationId = await getOrganizationIdFromSession();
  if (!organizationId) {
    return {
      message: "Error: User not authenticated or organization not found.",
      success: false,
    };
  }

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
    const originalPayment = await db.payment.findUnique({
      where: {
        id: paymentId,
        organizationId: organizationId,
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
    if (typeof originalPayment.installmentNumber !== 'number') {
      return {
        message: "Error: Payment is not associated with a specific installment and cannot be cancelled in this manner.",
        success: false,
      };
    }

    await db.$transaction(async (tx: PrismaClient) => {
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
    });

    return {
      message: `Payment ID: ${paymentId} (Installment: ${originalPayment.installmentNumber}) has been successfully cancelled (D/H entries created).`,
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