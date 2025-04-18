"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { headers } from 'next/headers';
import { EstadoVenta } from "@/types/BikesType"; // Importar enum
import { Prisma } from "@prisma/client";
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

// Acción para actualizar el estado (permite STOCK, PAUSADO o PROCESANDO)
export async function updateMotorcycleStatus(
    motorcycleId: number,
    newStatus: EstadoVenta // El nuevo estado deseado
): Promise<UpdateStatusState> {
    const organizationId = await getOrganizationIdFromSession();
    if (!organizationId) return { success: false, error: "Usuario no autenticado." };

    // Validar que el nuevo estado sea solo STOCK, PAUSADO o PROCESANDO
    if (newStatus !== EstadoVenta.STOCK && 
        newStatus !== EstadoVenta.PAUSADO && 
        newStatus !== EstadoVenta.PROCESANDO) {
        return { success: false, error: "Estado inválido solicitado." };
    }

    try {
        const updatedMotorcycle = await prisma.motorcycle.update({
            where: {
                id: motorcycleId,
                organizationId: organizationId,
                // Permitir cambiar a PROCESANDO desde STOCK o PAUSADO
                OR: [
                     { state: EstadoVenta.STOCK }, // Permite actualizar si está en STOCK
                     { state: EstadoVenta.PAUSADO }, // Permite actualizar si está PAUSADO
                     // Otros estados según necesidad
                ],
            },
            data: {
                state: newStatus, // Actualizar al nuevo estado
            },
        });

        // Si update no encuentra el registro (o no cumple el `where`), lanzará un error P2025
        // que será capturado abajo. Si llega aquí, se actualizó.

        console.log(`Motorcycle ${motorcycleId} status updated to ${newStatus}`);
        revalidatePath("/sales"); // Revalidar la página de ventas
        revalidatePath("/stock"); // Podría ser útil revalidar stock también
        return { success: true };

    } catch (error) {
        console.error("🔥 SERVER ACTION ERROR (updateMotorcycleStatus):", error);

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
             // P2025: Registro no encontrado (o no cumplió la condición WHERE)
             if (error.code === 'P2025') {
                 // Puede ser que el ID no exista O que el estado actual sea RESERVADO/ELIMINADO
                 return { success: false, error: "No se pudo actualizar el estado. La moto podría no existir o tener un estado no modificable (Reservado/Eliminado)." };
             }
        }
        const message = error instanceof Error ? error.message : "Error inesperado al actualizar estado.";
        return { success: false, error: message };
    }
} 