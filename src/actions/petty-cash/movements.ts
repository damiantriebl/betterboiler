"use server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client"; // Para Prisma.Decimal

// Definir la constante para la caja general si se usa aquí también
const GENERAL_ACCOUNT_ID_MOVEMENTS = "GENERAL_ACCOUNT"; 

interface GetMovementsParams {
  organizationId: string;
  branchId: string; // Puede ser un ID numérico (como string) o GENERAL_ACCOUNT_ID_MOVEMENTS
}

export async function getPettyCashMovements({ organizationId, branchId }: GetMovementsParams) {
  if (!organizationId || !branchId) {
    console.error("getPettyCashMovements: organizationId y branchId son requeridos.");
    return [];
  }

  let numericBranchId: number | null = null;
  if (branchId !== GENERAL_ACCOUNT_ID_MOVEMENTS) {
    const parsed = parseInt(branchId, 10);
    if (isNaN(parsed)) {
      console.error("getPettyCashMovements: branchId no es un número válido.");
      return [];
    }
    numericBranchId = parsed;
  }

  try {
    const movements = await prisma.pettyCashMovement.findMany({
      where: {
        account: {
          organizationId: organizationId,
          branchId: numericBranchId, // Esto ahora es number | null, lo cual es correcto para Prisma
        },
      },
      select: { 
        id: true,
        accountId: true,
        type: true,
        amount: true, 
        description: true,
        ticketNumber: true,
        receiptUrl: true,
        createdAt: true,
        user: { 
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            profileOriginal: true, 
            profileCrop: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return movements.map(m => ({
      ...m,
      amount: m.amount.toNumber(), 
    }));

  } catch (error) {
    console.error("Error al obtener los movimientos de caja chica:", error);
    return []; // O devolver un objeto de error
  }
}
