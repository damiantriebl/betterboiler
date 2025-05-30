"use server";

import db from "@/lib/prisma";
import type { ActionState } from "@/types/action-states";
import {
  type UpdateCurrentAccountInput,
  updateCurrentAccountSchema,
} from "@/zod/current-account-schemas";
import { Prisma } from "@prisma/client";
import type { CurrentAccount } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function updateCurrentAccount(
  input: UpdateCurrentAccountInput,
): Promise<ActionState<CurrentAccount | null>> {
  // Adjust data type as needed
  try {
    const validatedInput = updateCurrentAccountSchema.safeParse(input);
    if (!validatedInput.success) {
      return {
        success: false,
        error: `Error de validación: ${Object.values(validatedInput.error.flatten().fieldErrors).flat().join(", ")}`,
        data: null,
      };
    }

    const { id, ...updateData } = validatedInput.data;

    // Ensure the account exists
    const accountExists = await db.currentAccount.findUnique({
      where: { id },
    });

    if (!accountExists) {
      return { success: false, error: "Cuenta corriente no encontrada." };
    }

    // If startDate is being updated, and it's different, we might need to recalculate payment dates.
    // This can get complex if payments have already been made.
    // For simplicity, this basic update doesn't automatically recalculate all dependent dates
    // if only some fields like notes or reminderLeadTimeDays are updated.
    // A more robust solution would handle cascading changes to due dates if startDate or paymentFrequency changes.

    const updatedAccount = await db.currentAccount.update({
      where: { id },
      data: {
        ...updateData,
        // Convert startDate string to Date if provided
        startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
        // Ensure `paymentFrequency` and `status` are correctly typed if they come from enums
        paymentFrequency: updateData.paymentFrequency ? updateData.paymentFrequency : undefined,
        status: updateData.status ? updateData.status : undefined,
      },
    });

    revalidatePath("/current-accounts");
    revalidatePath(`/current-accounts/${id}`);

    return {
      success: true,
      message: "Cuenta corriente actualizada exitosamente.",
      data: updatedAccount,
    };
  } catch (error: unknown) {
    console.error("Error updating current account:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido al actualizar la cuenta corriente",
      data: null,
    };
  }
}
