"use server";

import prisma from "@/lib/prisma";
import { MotorcycleState, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getOrganizationIdFromSession } from "../get-Organization-Id-From-Session";

// Tipo para el retorno de la acción
interface UpdateStatusState {
  success: boolean;
  error?: string | null;
}

// Definir tipo de estados permitidos (excluyendo VENDIDO)
type AllowedMotorcycleStates = Exclude<MotorcycleState, "VENDIDO">;

// Acción para actualizar el estado (permite STOCK, PAUSADO, PROCESANDO o ELIMINADO)
export async function updateMotorcycleStatus(
  motorcycleId: number,
  newStatus: AllowedMotorcycleStates,
): Promise<UpdateStatusState> {
  const org = await getOrganizationIdFromSession();
  if (!org.organizationId) return { success: false, error: "Usuario no autenticado." };

  const organizationId = org.organizationId;

  // Estados permitidos a los que esta acción puede cambiar
  const validTargetStates = Object.values(MotorcycleState).filter(
    (state) => state !== "VENDIDO", // Excluir VENDIDO
  ) as AllowedMotorcycleStates[];

  // Validar que el nuevo estado sea uno de los permitidos
  if (!validTargetStates.includes(newStatus)) {
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
      newStatus === "STOCK" &&
      (moto.state === "RESERVADO" ||
        moto.state === "PROCESANDO" ||
        moto.state === "ELIMINADO")
    ) {
      data.client = { disconnect: true }; // Desconectar cliente
    }

    let allowedCurrentStates: Prisma.MotorcycleWhereInput[] = [];

    switch (newStatus) {
      case "STOCK":
        allowedCurrentStates = [
          { state: "PAUSADO" },
          { state: "RESERVADO" },
          { state: "PROCESANDO" },
          { state: "ELIMINADO" },
        ];
        break;
      case "PAUSADO":
        allowedCurrentStates = [{ state: "STOCK" }];
        break;
      case "PROCESANDO":
        allowedCurrentStates = [{ state: "STOCK" }];
        break;
      case "ELIMINADO":
        allowedCurrentStates = [
          { state: "STOCK" },
          { state: "PAUSADO" },
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
