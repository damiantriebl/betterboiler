'use server';

import { z } from 'zod';
import { Prisma } from '@prisma/client';
import db from '@/lib/prisma';
import {
  updateCurrentAccountSchema,
  type UpdateCurrentAccountInput,
} from '@/zod/current-account-schemas';
import type { ActionState } from '@/types/action-states';
import { revalidatePath } from 'next/cache';

export async function updateCurrentAccount(
  input: UpdateCurrentAccountInput,
): Promise<ActionState & { data?: any }> { // Adjust data type as needed
  try {
    const validatedInput = updateCurrentAccountSchema.safeParse(input);
    if (!validatedInput.success) {
      return {
        success: false,
        error: "Error de validación: " + Object.values(validatedInput.error.flatten().fieldErrors).flat().join(", "),
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
    if (updateData.startDate) {
        updateData.startDate = new Date(updateData.startDate);
        // Potentially add logic here to recalculate nextDueDate and finalPaymentDate if status is ACTIVE
        // and no payments have been made yet, or based on business rules.
    }

    const updatedAccount = await db.currentAccount.update({
      where: { id },
      data: {
        ...updateData,
        // Ensure `paymentFrequency` and `status` are correctly typed if they come from enums
        paymentFrequency: updateData.paymentFrequency ? updateData.paymentFrequency : undefined,
        status: updateData.status ? updateData.status : undefined,
      },
    });

    revalidatePath(`/current-accounts`);
    revalidatePath(`/current-accounts/${id}`);

    return {
      success: true,
      message: "Cuenta corriente actualizada exitosamente.",
      data: updatedAccount,
    };
  } catch (error) {
    console.error("Error updating current account:", error);
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: "Error de validación: " + Object.values(error.flatten().fieldErrors).flat().join(", ") 
      };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return { success: false, error: "Error de base de datos al actualizar la cuenta." };
    }
    return { success: false, error: "Error desconocido al actualizar la cuenta corriente." };
  }
} 