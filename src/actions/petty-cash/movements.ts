"use server";
import prisma from "@/lib/prisma";
// Prisma.Decimal import might not be needed if amounts are handled as numbers
// import { Prisma } from "@prisma/client"; 

// Definir la constante para la caja general si se usa aquí también
const GENERAL_ACCOUNT_ID_MOVEMENTS = "GENERAL_ACCOUNT"; 

interface GetMovementsParams {
  organizationId: string;
  branchId: string; // Puede ser un ID numérico (como string) o GENERAL_ACCOUNT_ID_MOVEMENTS
}

// Define a common structure for the returned movements
interface FormattedMovement {
  id: string;
  type: "DEBE" | "HABER";
  amount: number;
  description: string | null;
  ticketNumber: string | null; 
  receiptUrl: string | null;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    profileOriginal: string | null;
    profileCrop: string | null;
  } | null;
}

export async function getPettyCashMovements(
  { organizationId, branchId }: GetMovementsParams
): Promise<FormattedMovement[]> {
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
    // 1. Fetch Deposits (DEBE)
    const deposits = await prisma.pettyCashDeposit.findMany({
      where: {
        organizationId: organizationId,
        branchId: numericBranchId,
      },
      select: {
        id: true,
        amount: true,
        description: true,
        reference: true, 
        createdAt: true,
      }
    });

    const formattedDeposits: FormattedMovement[] = deposits.map(d => ({
      id: d.id,
      type: "DEBE",
      amount: d.amount, 
      description: d.description,
      ticketNumber: d.reference,
      receiptUrl: null,
      createdAt: d.createdAt,
      user: null, 
    }));

    // 2. Fetch Spends (HABER)
    const spends = await prisma.pettyCashSpend.findMany({
      where: {
        organizationId: organizationId,
        withdrawal: {
          deposit: {
            branchId: numericBranchId,
          }
        }
      },
      select: {
        id: true,
        amount: true,
        description: true,
        motive: true,
        ticketUrl: true,
        createdAt: true,
        withdrawal: { // Relación de PettyCashSpend a PettyCashWithdrawal
          select: {
            userId: true,   // Campo directo en PettyCashWithdrawal
            userName: true, // Campo directo en PettyCashWithdrawal
            // Se elimina la sub-selección de la relación 'user' ya que causa error
            // user: { select: { ... } }
          }
        }
      }
    });

    const formattedSpends: FormattedMovement[] = spends.map(s => {
      let userData: FormattedMovement['user'] = null;
      // s.withdrawal ahora solo tendrá userId y userName (si existen en el modelo y se seleccionaron)
      if (s.withdrawal && s.withdrawal.userId) {
        userData = {
          id: s.withdrawal.userId,
          name: s.withdrawal.userName, // Puede ser null si no existe o no se seleccionó
          email: null, // No disponible sin la relación directa al modelo User
          phone: null, // No disponible
          address: null, // No disponible
          profileOriginal: null, // No disponible
          profileCrop: null, // No disponible
        };
      }

      return {
        id: s.id,
        type: "HABER",
        amount: s.amount,
        description: s.description,
        ticketNumber: s.motive,
        receiptUrl: s.ticketUrl,
        createdAt: s.createdAt,
        user: userData,
      };
    });

    // 3. Combine and sort
    const combinedMovements = [...formattedDeposits, ...formattedSpends];
    combinedMovements.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return combinedMovements;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error al obtener los movimientos de caja chica:", errorMessage, error);
    return []; // Return empty array on error, or consider throwing
  }
}
