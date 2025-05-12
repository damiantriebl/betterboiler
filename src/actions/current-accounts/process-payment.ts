"use server";

import { getOrganizationIdFromSession } from "@/actions/getOrganizationIdFromSession"; // Assuming this path is correct
// import { db } from "@/lib/db"; // Placeholder for database utility
import { z } from "zod";

const processPaymentSchema = z.object({
  accountId: z.string().min(1, "Account ID is required."),
  paymentAmount: z.number().positive("El monto del pago debe ser positivo.").int("El monto del pago debe ser un número entero."),
  installmentNumber: z.number().int().positive("Installment number is required and must be a positive integer."),
  // We'll add a check for currentBalance in the component or action logic directly
});

export interface ProcessPaymentFormState {
  message: string;
  errors?: {
    accountId?: string[];
    paymentAmount?: string[];
    installmentNumber?: string[];
    _form?: string[];
  };
  success: boolean;
}

export async function processPayment(
  prevState: ProcessPaymentFormState,
  formData: FormData,
): Promise<ProcessPaymentFormState> {
  const organizationId = await getOrganizationIdFromSession();
  if (!organizationId) {
    return {
      message: "Error: User not authenticated or organization not found.",
      success: false,
    };
  }

  const validatedFields = processPaymentSchema.safeParse({
    accountId: formData.get("accountId"),
    paymentAmount: Number(formData.get("paymentAmount")),
    installmentNumber: Number(formData.get("installmentNumber")),
  });

  if (!validatedFields.success) {
    return {
      message: "Error: Invalid data.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { accountId, paymentAmount, installmentNumber } = validatedFields.data;

  try {
    // Placeholder for database interaction to create the payment record
    // await db.payment.create({
    //   data: {
    //     currentAccountId: accountId,
    //     amountPaid: paymentAmount,
    //     installmentNumber: installmentNumber,
    //     paymentDate: new Date(),
    //     organizationId: organizationId,
    //     // installmentVersion will be null by default
    //     // paymentMethod, notes, transactionReference would come from formData if needed
    //   }
    // });

    console.log(
      `Processing payment of ${paymentAmount} for account ${accountId}, installment ${installmentNumber} in organization ${organizationId}`,
    );
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      message: `Payment of ${paymentAmount} for installment ${installmentNumber} processed successfully for account ${accountId}.`,
      success: true,
    };
  } catch (error) {
    console.error("Error processing payment:", error);
    // Check if error is a Prisma specific error for more detailed messages if needed
    let errorMessage = "Error: An unexpected error occurred while processing the payment.";
    if (error instanceof Error) {
      // Potentially more specific error handling here
    }
    return {
      message: errorMessage,
      success: false,
    };
  }
} 