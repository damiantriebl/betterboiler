"use server";

import prisma from "@/lib/prisma";
import type { PettyCashDeposit, PettyCashWithdrawal, PettyCashSpend } from "@prisma/client";
import { getOrganizationIdFromSession } from "../get-Organization-Id-From-Session";

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
    const org = await getOrganizationIdFromSession();
    if (org.error || !org.organizationId) {
      return { error: org.error || "Organization not found" };
    }
    const { organizationId } = org;

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
