"use server";

import prisma from "@/lib/prisma";
import { getOrganizationIdFromSession } from "./getOrganizationIdFromSession";
import type { PettyCashDeposit, PettyCashWithdrawal, PettyCashSpend } from "@prisma/client";

// Definimos un tipo para la estructura de datos anidada que esperamos
export interface PettyCashData extends PettyCashDeposit {
  withdrawals: (PettyCashWithdrawal & {
    spends: PettyCashSpend[];
  })[];
}

export async function getPettyCashData(): Promise<{
  data?: PettyCashData[];
  error?: string;
}> {
  try {
    const sessionInfo = await getOrganizationIdFromSession();
    if (sessionInfo.error || !sessionInfo.organizationId) {
      return { error: sessionInfo.error || "Organization not found" };
    }
    const { organizationId } = sessionInfo;

    const deposits = await prisma.pettyCashDeposit.findMany({
      where: {
        organizationId,
      },
      include: {
        withdrawals: {
          include: {
            spends: true,
          },
          orderBy: {
            date: "desc", // Opcional: ordenar retiros
          },
        },
      },
      orderBy: {
        date: "desc", // Ordenar depósitos por fecha
      },
    });

    return { data: deposits as PettyCashData[] };
  } catch (error) {
    console.error("Error fetching petty cash data:", error);
    // Mejorar el log de errores si es posible
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { error: `Failed to fetch petty cash data: ${errorMessage}` };
  }
} 