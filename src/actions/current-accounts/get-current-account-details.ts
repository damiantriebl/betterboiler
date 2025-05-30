"use server";

import db from "@/lib/prisma";
import type { ActionState } from "@/types/action-states";

export async function getCurrentAccountDetails(accountId: string): Promise<ActionState<any>> {
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
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        motorcycle: {
          include: {
            model: {
              select: { id: true, name: true },
            },
          },
        },
        payments: {
          orderBy: {
            paymentDate: "desc",
          },
        },
      },
    });

    if (!account) {
      return { success: false, error: "Cuenta corriente no encontrada." };
    }

    return {
      success: true,
      data: account,
    };
  } catch (error) {
    console.error("Error fetching current account details:", error);
    return {
      success: false,
      error: "Error desconocido al obtener los detalles de la cuenta corriente.",
    };
  }
}
