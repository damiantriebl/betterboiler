"use server";
import prisma from "@/lib/prisma";
// Se elimina: import type { PettyCashMovement } from '@prisma/client'; 
import { Prisma } from '@prisma/client'; 

const GENERAL_ACCOUNT_ID_VALUE = "GENERAL_ACCOUNT"; // Definir la constante aquí también

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
    numericBranchId = Number.parseInt(branchId, 10);
    if (Number.isNaN(numericBranchId)) {
      console.error("getPettyCashBalance: branchId no es un número válido ni la caja general.");
      return { balance: 0, error: "Branch ID inválido." };
    }
  }
  // Si branchId es GENERAL_ACCOUNT_ID_VALUE, numericBranchId permanecerá null.

  try {
    // Calcular el total de depósitos (DEBE)
    const totalDepositsResult = await prisma.pettyCashDeposit.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        organizationId: organizationId,
        branchId: numericBranchId, // null para caja general, número para branch específica
      },
    });
    const depositsSum = totalDepositsResult._sum.amount || 0;

    // Calcular el total de gastos (HABER)
    // Los gastos (PettyCashSpend) están vinculados a una organización y
    // a una sucursal/caja general a través de PettyCashWithdrawal -> PettyCashDeposit.
    const totalSpendsResult = await prisma.pettyCashSpend.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        organizationId: organizationId, // El gasto pertenece a esta organización
        withdrawal: {                 // El retiro asociado al gasto
          deposit: {                  // El depósito original asociado al retiro
            branchId: numericBranchId, // Debe pertenecer a la sucursal/caja general especificada
          },
        },
      },
    });
    const spendsSum = totalSpendsResult._sum.amount || 0;

    const balanceDecimal = new Prisma.Decimal(depositsSum).minus(new Prisma.Decimal(spendsSum));

    return { balance: balanceDecimal.toNumber() };

  } catch (error) {
    console.error("Error al calcular el balance de caja chica:", error);
    // Asegurarse de que el error se propague o se maneje de forma que la UI pueda reaccionar
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Errores específicos de Prisma
      return { balance: 0, error: `Error de base de datos: ${error.message}` };
    }
    return { balance: 0, error: "Error interno al calcular el balance." };
  }
}
