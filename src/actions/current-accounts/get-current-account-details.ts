'use server';

import db from '@/lib/prisma';
import type { ActionState } from '@/types/action-states';
import type { CurrentAccount, Client, Model, CurrentAccountPayment } from '@prisma/client';

// Define a more specific type for the returned account, including relations
export type CurrentAccountFullDetails = CurrentAccount & {
  client: Pick<Client, 'id' | 'firstName' | 'lastName' | 'email' | 'phone'>; // Adjust fields as per your Client model
  model: Pick<Model, 'id' | 'name'>; // Adjust fields as per your Model model
  payments: CurrentAccountPayment[];
};

export async function getCurrentAccountDetails(
  accountId: string,
): Promise<ActionState & { data?: CurrentAccountFullDetails }> {
  if (!accountId) {
    return { success: false, error: "ID de cuenta corriente no proporcionado." };
  }

  try {
    const account = await db.currentAccount.findUnique({
      where: { id: accountId },
      include: {
        client: {
          select: { 
            id: true, 
            firstName: true, // Tentative
            lastName: true,  // Tentative
            email: true,     // Tentative
            phone: true      // Tentative
            // Add/remove fields to match your Client model structure
          },
        },
        model: {
          select: { id: true, name: true }, // Assuming model has a 'name'
        },
        payments: {
          orderBy: {
            paymentDate: 'desc', // Show recent payments first
          },
        },
      },
    });

    if (!account) {
      return { success: false, error: "Cuenta corriente no encontrada." };
    }

    return {
      success: true,
      data: account as CurrentAccountFullDetails, // Cast to the more specific type
    };
  } catch (error) {
    console.error("Error fetching current account details:", error);
    return { success: false, error: "Error desconocido al obtener los detalles de la cuenta corriente." };
  }
} 