"use server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client"; // Para el tipo Decimal y errores
import { getOrganizationIdFromSession } from "@/actions/get-Organization-Id-From-Session"; // Importar la función de sesión actualizada

const GENERAL_ACCOUNT_ID_DEPOSIT = "GENERAL_ACCOUNT"; // Mismo identificador que en el frontend

interface DepositPettyCashParams {
  // organizationId no es necesario aquí, se obtendrá de la sesión
  branchIdReceived: string;
  // userId no es necesario aquí, se obtendrá de la sesión si es el mismo que el que registra
  // Si userId es para el "beneficiario" o un usuario específico, mantenerlo.
  // Por ahora, asumiré que el userId del movimiento es el usuario que realiza la acción.
  amount: number;
  description?: string;
  ticketNumber?: string;
}

export async function depositPettyCash({
  branchIdReceived,
  amount,
  description,
  ticketNumber,
}: DepositPettyCashParams) {

  const sessionData = await getOrganizationIdFromSession();
  if (sessionData.error || !sessionData.organizationId || !sessionData.userId) {
    throw new Error(sessionData.error || "No se pudo obtener la información de la sesión o falta información esencial (ID de organización, ID de usuario).");
  }

  const { organizationId, userId } = sessionData;

  if (amount <= 0) {
    throw new Error("El monto del depósito debe ser positivo.");
  }

  let actualBranchIdForDb: number | null = null;
  if (branchIdReceived !== GENERAL_ACCOUNT_ID_DEPOSIT) {
    const parsedBranchId = parseInt(branchIdReceived, 10);
    if (isNaN(parsedBranchId)) {
      throw new Error("Branch ID inválido.");
    }
    actualBranchIdForDb = parsedBranchId;
  }
  // Si branchIdReceived es GENERAL_ACCOUNT_ID_DEPOSIT, actualBranchIdForDb será null.

  try {
    let pettyCashAccount;

    if (actualBranchIdForDb === null) {
      // Búsqueda específica para Caja General donde branchId ES NULL
      pettyCashAccount = await prisma.pettyCashAccount.findFirst({ 
        where: {
          organizationId: organizationId,
          branchId: null, // Condición directa en branchId
        },
      });
    } else {
      // Búsqueda para sucursal específica usando el índice único
      pettyCashAccount = await prisma.pettyCashAccount.findUnique({
        where: {
          organizationId_branchId: {
            organizationId: organizationId,
            branchId: actualBranchIdForDb, // Aquí actualBranchIdForDb es un número
          },
        },
      });
    }

    // Si no se encuentra, crearla
    if (!pettyCashAccount) {
      pettyCashAccount = await prisma.pettyCashAccount.create({
        data: {
          organizationId: organizationId,
          branchId: actualBranchIdForDb, // Esto es correcto para la creación (number | null)
        },
      });
    }

    // Crear el PettyCashMovement
    const movement = await prisma.pettyCashMovement.create({
      data: {
        accountId: pettyCashAccount.id,
        userId: userId,
        type: "DEBE", // Depósito es DEBE
        amount: new Prisma.Decimal(amount),
        description: description,
        ticketNumber: ticketNumber,
      },
    });
    return {
        ...movement,
        amount: movement.amount.toNumber() // Devolver con amount como número
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Manejar errores conocidos de Prisma, ej. violación de constraint único
      console.error("Error de Prisma al depositar en caja chica:", error.message);
    } else {
      console.error("Error inesperado al depositar en caja chica:", error);
    }
    // Re-lanzar el error o devolver un objeto de error estructurado
    throw new Error("No se pudo completar el depósito en la caja chica.");
  }
}