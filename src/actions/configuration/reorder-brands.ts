"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getOrganizationIdFromSession } from "../util";

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
    // Obtener organizationId de la sesión
    const org = await getOrganizationIdFromSession();
    if (!org.organizationId) {
      return { success: false, error: "Usuario no autenticado o sin organización." };
    }

    const organizationId = org.organizationId;

    // Usar una transacción para asegurar que todas las actualizaciones se hagan o ninguna
    await prisma.$transaction(
      // Crear un array de promesas, una por cada asociación OrganizationBrand a actualizar
      brandIdsInOrder.map((brandId, index) =>
        prisma.organizationBrand.updateMany({
          where: { 
            organizationId: organizationId,
            brandId: brandId 
          },
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
