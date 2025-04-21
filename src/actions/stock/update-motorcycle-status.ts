"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { MotorcycleState, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

// Helper para obtener organizationId (asumiendo que está disponible)
async function getOrganizationIdFromSession(): Promise<string | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user?.organizationId ?? null;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

// Tipo para el retorno de la acción
interface UpdateStatusState {
  success: boolean;
  error?: string | null;
}

// Acción para actualizar el estado (permite STOCK, PAUSADO, PROCESANDO o ELIMINADO)
export async function updateMotorcycleStatus(
  motorcycleId: number,
  newStatus: MotorcycleState,
): Promise<UpdateStatusState> {
  const organizationId = await getOrganizationIdFromSession();
  if (!organizationId) return { success: false, error: "Usuario no autenticado." };

  // Estados permitidos a los que esta acción puede cambiar
  const validTargetStates = Object.values(MotorcycleState).filter(
    (state) => state !== MotorcycleState.VENDIDO, // Excluir VENDIDO
  );

  // Validar que el nuevo estado sea uno de los permitidos
  if (!validTargetStates.includes(newStatus as MotorcycleState)) {
    return { success: false, error: `Estado objetivo inválido: ${newStatus}` };
  }

  let moto: { state: MotorcycleState } | null = null;

  try {
    const data: Prisma.MotorcycleUpdateInput = { state: newStatus };

    moto = await prisma.motorcycle.findUnique({
      where: { id: motorcycleId, organizationId },
      select: { state: true },
    });

    if (!moto) {
      return { success: false, error: "Moto no encontrada." };
    }

    // Lógica específica al cambiar de estado
    if (
      newStatus === MotorcycleState.STOCK &&
      (moto.state === MotorcycleState.RESERVADO ||
        moto.state === MotorcycleState.PROCESANDO ||
        moto.state === MotorcycleState.ELIMINADO)
    ) {
      data.clientId = null;
    }

    let allowedCurrentStates: Prisma.MotorcycleWhereInput[] = [];

    switch (newStatus) {
      case MotorcycleState.STOCK:
        allowedCurrentStates = [
          { state: MotorcycleState.PAUSADO },
          { state: MotorcycleState.RESERVADO },
          { state: MotorcycleState.PROCESANDO },
          { state: MotorcycleState.ELIMINADO },
        ];
        break;
      case MotorcycleState.PAUSADO:
        allowedCurrentStates = [{ state: MotorcycleState.STOCK }];
        break;
      case MotorcycleState.PROCESANDO:
        allowedCurrentStates = [{ state: MotorcycleState.STOCK }];
        break;
      case MotorcycleState.ELIMINADO:
        allowedCurrentStates = [
          { state: MotorcycleState.STOCK },
          { state: MotorcycleState.PAUSADO },
        ];
        break;
      default:
        return { success: false, error: "Transición de estado no manejada." };
    }

    const updatedMotorcycle = await prisma.motorcycle.update({
      where: {
        id: motorcycleId,
        organizationId: organizationId,
        OR: allowedCurrentStates,
      },
      data: data,
    });

    console.log(`Motorcycle ${motorcycleId} status updated from ${moto.state} to ${newStatus}`);
    revalidatePath("/sales");
    revalidatePath("/stock");
    return { success: true };
  } catch (error) {
    console.error("🔥 SERVER ACTION ERROR (updateMotorcycleStatus):", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        // Ajustar mensaje de error usando la variable 'moto' con alcance superior
        const currentStateMessage = moto
          ? `su estado actual (${moto.state})`
          : "podría no existir o";
        return {
          success: false,
          error: `No se pudo actualizar el estado. La moto ${currentStateMessage} no permite esta transición a ${newStatus}.`,
        };
      }
    }
    const message =
      error instanceof Error ? error.message : "Error inesperado al actualizar estado.";
    return { success: false, error: message };
  }
}
