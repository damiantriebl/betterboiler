"use server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getOrganizationIdFromSession } from "@/actions/get-Organization-Id-From-Session";

const GENERAL_ACCOUNT_ID_ACTION_SPEND = "GENERAL_ACCOUNT"; // Constante para la caja general

interface SpendPettyCashParams {
  branchIdContext: string; 
  amount: number;
  description: string; // Para gastos, la descripción es obligatoria
  ticketNumber?: string;
  receiptUrl?: string;
}

export async function spendPettyCash({
  branchIdContext,
  amount,
  description, 
  ticketNumber,
  receiptUrl,
}: SpendPettyCashParams) {

  const sessionData = await getOrganizationIdFromSession();
  console.log("🔍 DEBUG Session in spendPettyCash:", sessionData);
  
  if (sessionData.error || !sessionData.organizationId || !sessionData.userId) { 
    throw new Error(sessionData.error || "No se pudo obtener la información de la sesión o falta información esencial.");
  }

  const { organizationId, userId } = sessionData; 

  if (amount <= 0) {
    throw new Error("El monto del gasto debe ser positivo.");
  }
  if (!description) { 
    throw new Error("La descripción es obligatoria para un gasto.");
  }

  let actualBranchIdForDb: number | null = null;
  if (branchIdContext !== GENERAL_ACCOUNT_ID_ACTION_SPEND) {
    const parsedBranchId = parseInt(branchIdContext, 10);
    if (isNaN(parsedBranchId)) {
      throw new Error("Branch ID inválido para el gasto.");
    }
    actualBranchIdForDb = parsedBranchId;
  }

  try {
    let pettyCashAccount;
    if (actualBranchIdForDb === null) {
      pettyCashAccount = await prisma.pettyCashAccount.findFirst({
        where: {
          organizationId: organizationId,
          branchId: null,
        },
      });
    } else {
      pettyCashAccount = await prisma.pettyCashAccount.findUnique({
        where: {
          organizationId_branchId: {
            organizationId: organizationId,
            branchId: actualBranchIdForDb,
          },
        },
      });
    }

    if (!pettyCashAccount) {
      throw new Error("La cuenta de caja chica no existe. No se puede registrar el gasto.");
    }

    const movement = await prisma.pettyCashMovement.create({
      data: {
        accountId: pettyCashAccount.id,
        userId: userId, // El gasto lo realiza el usuario de la sesión
        type: "HABER", 
        amount: new Prisma.Decimal(amount),
        description: description, 
        ticketNumber: ticketNumber,
        receiptUrl: receiptUrl,
      },
    });
    return {
        ...movement,
        amount: movement.amount.toNumber(),
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Error de Prisma al registrar gasto de caja chica:", error.message);
    } else {
      console.error("Error inesperado al registrar gasto de caja chica:", error);
    }
    throw new Error("No se pudo completar el registro del gasto.");
  }
}
