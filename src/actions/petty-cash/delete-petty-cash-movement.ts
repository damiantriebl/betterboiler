"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getOrganizationIdFromSession } from "@/actions/get-Organization-Id-From-Session";

interface DeletePettyCashMovementParams {
    movementId: string;
}

export async function deletePettyCashMovement(
    params: DeletePettyCashMovementParams
): Promise<{ success: boolean; error?: string; message?: string }> {
    const { movementId } = params;

    if (!movementId) {
        return { success: false, error: "ID de movimiento no proporcionado." };
    }

    const sessionData = await getOrganizationIdFromSession();
    if (sessionData.error || !sessionData.organizationId || !sessionData.userRole) {
        return { success: false, error: sessionData.error || "No se pudo obtener la información de la sesión o falta información esencial." };
    }

    const { organizationId, userRole } = sessionData;

    // Verificar roles permitidos
    const allowedRoles = ["ADMIN", "ROOT", "CASH_MANAGER"];
    if (!allowedRoles.includes(userRole)) {
        return { success: false, error: "Acceso denegado. No tienes permiso para realizar esta acción." };
    }

    try {
        // Primero, encontrar el movimiento para asegurar que existe y pertenece a la organización
        const existingMovement = await prisma.pettyCashMovement.findUnique({
            where: { id: movementId },
            include: {
                account: true, // Incluir la cuenta para verificar organizationId
            },
        });

        if (!existingMovement) {
            return { success: false, error: "Movimiento no encontrado." };
        }

        if (existingMovement.account.organizationId !== organizationId) {
            return { success: false, error: "Acceso denegado. Este movimiento no pertenece a tu organización." };
        }

        // Eliminar el movimiento
        await prisma.pettyCashMovement.delete({
            where: { id: movementId },
        });

        // Considerar revalidar paths si es necesario para que los datos se actualicen en otras partes
        // Por ejemplo, la página principal de caja chica
        revalidatePath("/(app)/petty-cash", "page"); // Ajusta el path según tu estructura
        // También podrías querer revalidar la API route si tienes alguna que sirva estos datos.

        return { success: true, message: "Movimiento eliminado correctamente." };

    } catch (error) {
        console.error("Error deleting petty cash movement:", error);
        // Verifica si el error es una instancia de Error para acceder a `message` de forma segura
        const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido";
        return {
            success: false,
            error: `Error al eliminar el movimiento: ${errorMessage}`,
        };
    }
} 