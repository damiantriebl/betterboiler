"use server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { WithdrawPettyCashFormValues } from "@/zod/pettyCashSchema"; // Importar el tipo del formulario Zod
import { getOrganizationIdFromSession } from "@/actions/get-Organization-Id-From-Session"; // Importar
import type { PettyCashAccount } from "@/types/PettyCashAccount";

const GENERAL_ACCOUNT_ID_ACTION_WITHDRAW = "GENERAL_ACCOUNT";

// Usar el tipo del formulario Zod y añadir los campos que no vienen del form directamente
export interface WithdrawPettyCashActionParams extends Omit<WithdrawPettyCashFormValues, 'amount'> { // Omitir amount porque lo pasaremos como number
  // organizationId se obtendrá de la sesión
  branchIdContext: string; 
  // registrarUserId se obtendrá de la sesión (será el sessionData.userId)
  amount: number; 
}

export async function withdrawPettyCash({
  branchIdContext,
  assignedUserId, 
  amount,
  description,
  ticketNumber,
}: WithdrawPettyCashActionParams) {

  const sessionData = await getOrganizationIdFromSession();
  if (sessionData.error || !sessionData.organizationId || !sessionData.userId) {
    return { success: false, error: sessionData.error || "No se pudo obtener la información de la sesión o falta información esencial." };
  }

  const { organizationId, userId: registrarUserId } = sessionData; 

  if (amount <= 0) {
    return { success: false, error: "El monto del retiro debe ser positivo." }; 
  }
  if (!assignedUserId) {
    return { success: false, error: "Debe seleccionar un beneficiario para el viático." };
  }

  let actualBranchIdForDb: number | null = null;
  if (branchIdContext !== GENERAL_ACCOUNT_ID_ACTION_WITHDRAW) {
    const parsedBranchId = Number.parseInt(branchIdContext, 10);
    if (Number.isNaN(parsedBranchId)) {
      return { success: false, error: "Branch ID inválido para el retiro." };
    }
    actualBranchIdForDb = parsedBranchId;
  }

  try {
    let pettyCashAccount: PettyCashAccount | null;
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
      return { success: false, error: "La cuenta de caja chica no existe. No se puede realizar la operación." };
    }

    const movement = await prisma.pettyCashMovement.create({
      data: {
        accountId: pettyCashAccount.id,
        userId: assignedUserId,
        type: "HABER",
        amount: new Prisma.Decimal(amount),
        description: description,
        ticketNumber: ticketNumber,
      },
    });
    return {
        success: true,
        message: "Entrega de viáticos registrada correctamente.",
        data: {
            ...movement,
            amount: movement.amount.toNumber(),
        }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "No se pudo completar el retiro de la caja chica.";
    console.error("Error al retirar de caja chica:", errorMessage, error);
    return { success: false, error: errorMessage };
  }
}
