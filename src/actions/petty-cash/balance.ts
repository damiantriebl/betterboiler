"use server";
import prisma from "@/lib/prisma";
import type { PettyCashMovement } from '@prisma/client'; 
import { Prisma } from '@prisma/client'; 

const GENERAL_ACCOUNT_ID_VALUE = "GENERAL_ACCOUNT"; // Definir la constante aquí también

interface AggregationResult {
  type: PettyCashMovement['type']; 
  _sum: {
    amount: Prisma.Decimal | null; 
  };
}

export async function getPettyCashBalance(organizationId: string, branchId: string) {
  if (!organizationId) {
    console.error("getPettyCashBalance: organizationId es requerido.");
    return { balance: 0, error: "Organization ID es requerido." };
  }
  if (!branchId) { // Aunque ahora branchId siempre debería tener un valor (ID numérico o GENERAL_ACCOUNT_ID)
    console.error("getPettyCashBalance: branchId es requerido.");
    return { balance: 0, error: "Branch ID es requerido." };
  }

  let numericBranchId: number | null = null;
  if (branchId !== GENERAL_ACCOUNT_ID_VALUE) {
    numericBranchId = parseInt(branchId, 10);
    if (isNaN(numericBranchId)) {
      console.error("getPettyCashBalance: branchId no es un número válido ni la caja general.");
      return { balance: 0, error: "Branch ID inválido." };
    }
  }
  // Si branchId es GENERAL_ACCOUNT_ID_VALUE, numericBranchId permanecerá null.

  try {
    const agg = await prisma.pettyCashMovement.groupBy({
      by: ["type"],
      where: {
        account: { 
          organizationId: organizationId,
          // Si numericBranchId es null (Caja General), Prisma buscará PettyCashAccount.branchId = null
          // Si numericBranchId tiene un valor, buscará esa sucursal específica.
          branchId: numericBranchId, 
        }
      },
      _sum: { amount: true },
    });

    const typedAgg = agg as AggregationResult[];

    const debeDecimal = typedAgg.find((x: AggregationResult) => x.type === "DEBE")?._sum.amount || new Prisma.Decimal(0);
    const haberDecimal = typedAgg.find((x: AggregationResult) => x.type === "HABER")?._sum.amount || new Prisma.Decimal(0);

    const balance = debeDecimal.minus(haberDecimal); 

    return { balance: balance.toNumber() }; 

  } catch (error) {
    console.error("Error al calcular el balance de caja chica:", error);
    return { balance: 0, error: "Error al calcular el balance." };
  }
}
