"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

// Tipo simple para el estado de esta acción específica
interface ReorderState {
  success: boolean;
  error?: string | null;
}

export async function reorderBrands(brandIdsInOrder: number[]): Promise<ReorderState> {
  if (!brandIdsInOrder || brandIdsInOrder.length === 0) {
    return { success: false, error: "No se proporcionó un orden válido." };
  }

  try {
    // Usar una transacción para asegurar que todas las actualizaciones se hagan o ninguna
    await prisma.$transaction(
      // Crear un array de promesas, una por cada marca a actualizar
      brandIdsInOrder.map((brandId, index) =>
        prisma.brand.update({
          where: { id: brandId },
          data: { order: index }, // Asignar el índice del array como el nuevo orden
        }),
      ),
    );

    revalidatePath("/configuracion"); // Revalidar para mostrar el nuevo orden
    return { success: true };
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (reorderBrands):", error);
    const errorMessage = error instanceof Error ? error.message : "Error al reordenar las marcas.";
    return { success: false, error: errorMessage };
  }
}
