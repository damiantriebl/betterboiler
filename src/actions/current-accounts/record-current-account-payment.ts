"use server";

import db from "@/lib/prisma";
import type { ActionState } from "@/types/action-states";
import { type RecordPaymentInput, recordPaymentSchema } from "@/zod/current-account-schemas";
import {
  type CurrentAccount,
  type CurrentAccountStatus,
  type Payment,
  type PaymentFrequency,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Helper to determine next due date based on the last payment and frequency
function calculateNextDueDateAfterPayment(lastDueDate: Date, frequency: PaymentFrequency): Date {
  const next = new Date(lastDueDate);
  switch (frequency) {
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "BIWEEKLY":
      next.setDate(next.getDate() + 14);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3);
      break;
    case "ANNUALLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

export async function recordCurrentAccountPayment(
  input: RecordPaymentInput,
): Promise<ActionState & { data?: Payment }> {
  try {
    const validatedInput = recordPaymentSchema.safeParse(input);
    if (!validatedInput.success) {
      return {
        success: false,
        error: `Error de validación: ${Object.values(validatedInput.error.flatten().fieldErrors).flat().join(", ")}`,
      };
    }

    const {
      currentAccountId,
      amountPaid,
      paymentDate,
      paymentMethod,
      transactionReference,
      notes,
      isDownPayment,
    } = validatedInput.data;

    // Use a transaction to ensure data integrity
    const result = await db.$transaction(async (tx) => {
      const account: CurrentAccount | null = await tx.currentAccount.findUnique({
        where: { id: currentAccountId },
      });

      if (!account) {
        throw new Error("Cuenta corriente no encontrada.");
      }

      if (account.status === "PAID_OFF") {
        throw new Error("Esta cuenta corriente ya ha sido saldada.");
      }

      // Convertir el remainingAmount a número si es necesario
      const currentRemainingAmount =
        typeof account.remainingAmount === "number"
          ? account.remainingAmount
          : Number.parseFloat(account.remainingAmount.toString());

      const newRemainingAmount = currentRemainingAmount - amountPaid;

      let newStatus: CurrentAccountStatus = account.status;
      let updatedNextDueDate: Date | null = account.nextDueDate;

      if (newRemainingAmount <= 0) {
        newStatus = "PAID_OFF";
        updatedNextDueDate = null;
      } else if (account.nextDueDate && !isDownPayment) {
        updatedNextDueDate = calculateNextDueDateAfterPayment(
          new Date(account.nextDueDate),
          account.paymentFrequency,
        );
      }

      const newPayment = await tx.payment.create({
        data: {
          currentAccountId,
          amountPaid,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMethod,
          transactionReference,
          notes,
          organizationId: account.organizationId,
        },
      });

      const updatedAccount = await tx.currentAccount.update({
        where: { id: currentAccountId },
        data: {
          remainingAmount: newRemainingAmount,
          status: newStatus,
          nextDueDate: updatedNextDueDate,
        },
      });

      return { newPayment, updatedAccount };
    });

    revalidatePath("/current-accounts");
    revalidatePath(`/current-accounts/${currentAccountId}`);

    return {
      success: true,
      message: "Pago registrado exitosamente.",
      data: result.newPayment,
    };
  } catch (error: unknown) {
    console.error("Error recording payment:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Error de validación: ${Object.values(error.flatten().fieldErrors).flat().join(", ")}`,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al registrar el pago.",
    };
  }
}
