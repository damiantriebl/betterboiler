"use server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client"; // Para errores. Prisma.Decimal no se usa si el campo es Float.
import { getOrganizationIdFromSession } from "@/actions/get-Organization-Id-From-Session";

const GENERAL_ACCOUNT_ID_DEPOSIT = "GENERAL_ACCOUNT";

interface DepositPettyCashParams {
  branchIdReceived: string;
  amount: number;
  description?: string;
  ticketNumber?: string; // Mapeado a 'reference' en PettyCashDeposit
}

export async function depositPettyCash({
  branchIdReceived,
  amount,
  description,
  ticketNumber,
}: DepositPettyCashParams) {

  const sessionData = await getOrganizationIdFromSession();
  if (sessionData.error || !sessionData.organizationId) {
    throw new Error(sessionData.error || "No se pudo obtener la información de la sesión o falta el ID de organización.");
  }

  const { organizationId } = sessionData;

  if (amount <= 0) {
    throw new Error("El monto del depósito debe ser positivo.");
  }

  let actualBranchIdForDb: number | null = null;
  if (branchIdReceived !== GENERAL_ACCOUNT_ID_DEPOSIT) {
    const parsedBranchId = Number.parseInt(branchIdReceived, 10);
    if (Number.isNaN(parsedBranchId)) {
      throw new Error("Branch ID inválido.");
    }
    actualBranchIdForDb = parsedBranchId;
  }

  try {
    const deposit = await prisma.pettyCashDeposit.create({
      data: {
        organizationId: organizationId,
        branchId: actualBranchIdForDb,
        amount: amount, // amount es 'number', Prisma maneja la conversión a Float.
        date: new Date(),
        description: description ?? "Depósito a caja chica",
        reference: ticketNumber,
      },
    });

    // El objeto 'deposit' devuelto por Prisma ya tiene 'amount' como 'number'.
    return deposit;

  } catch (error) {
    // Asegurarse de que el mensaje de error se maneje correctamente
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(`Error de Prisma al crear depósito en caja chica: ${errorMessage}`, error); // Log completo del error
    } else {
      console.error(`Error inesperado al crear depósito en caja chica: ${errorMessage}`, error); // Log completo del error
    }
    // Es importante relanzar el error o devolver un objeto que indique el fallo
    // para que el frontend pueda reaccionar.
    throw new Error(`No se pudo completar el depósito en la caja chica: ${errorMessage}`);
  }
}