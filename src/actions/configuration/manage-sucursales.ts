"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { auth } from "@/auth";
import { headers } from 'next/headers';
import { Prisma, Sucursal } from "@prisma/client"; // Importar tipo Sucursal
import {
    createBranchSchema,
    updateBranchSchema,
    deleteBranchSchema,
    updateBranchOrderSchema
} from "@/zod/BranchZod";

// Helper para obtener organizationId de la sesión
async function getOrganizationIdFromSession(): Promise<string | null> {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user?.organizationId ?? null;
}

// --- Acción: createSucursal ---
export interface CreateSucursalState {
    success: boolean;
    error?: string | null;
    sucursal?: Sucursal | null; // Devolver la sucursal creada
}

export async function createSucursal(prevState: CreateSucursalState | null, formData: FormData): Promise<CreateSucursalState> {
    const organizationId = await getOrganizationIdFromSession();
    if (!organizationId) return { success: false, error: "Usuario no autenticado o sin organización." };

    const validatedFields = createBranchSchema.safeParse({
        name: formData.get("name"),
    });

    if (!validatedFields.success) {
        const errors = Object.entries(validatedFields.error.flatten().fieldErrors).map(([f, m]) => `${f}: ${(m ?? []).join(',')}`).join('; ');
        return { success: false, error: `Datos inválidos: ${errors}` };
    }

    const { name } = validatedFields.data;
    const normalizedName = name.trim(); // Normalizar nombre si es necesario

    try {
        // Calcular el siguiente orden
        const maxOrderResult = await prisma.sucursal.aggregate({
            _max: { order: true },
            where: { organizationId },
        });
        const nextOrder = (maxOrderResult._max.order ?? -1) + 1;

        // Crear la sucursal
        const newSucursal = await prisma.sucursal.create({
            data: {
                name: normalizedName,
                order: nextOrder,
                organizationId: organizationId,
            },
        });

        revalidatePath("/configuracion");
        return { success: true, sucursal: newSucursal };

    } catch (error) {
        console.error("🔥 ERROR SERVER ACTION (createSucursal):", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            // Error de constraint único (organizationId, name)
             return { success: false, error: `La sucursal \"${normalizedName}\" ya existe en tu organización.` };
        }
        const message = error instanceof Error ? error.message : "Error inesperado.";
        return { success: false, error: `Error al crear la sucursal: ${message}` };
    }
}

// --- Acción: updateSucursal ---
export interface UpdateSucursalState {
    success: boolean;
    error?: string | null;
    sucursal?: Sucursal | null; // Devolver la sucursal actualizada
}

export async function updateSucursal(prevState: UpdateSucursalState | null, formData: FormData): Promise<UpdateSucursalState> {
    const organizationId = await getOrganizationIdFromSession();
    if (!organizationId) return { success: false, error: "Usuario no autenticado o sin organización." };

    const validatedFields = updateBranchSchema.safeParse({
        id: formData.get("id"),
        name: formData.get("name"),
    });

    if (!validatedFields.success) {
         const errors = Object.entries(validatedFields.error.flatten().fieldErrors).map(([f, m]) => `${f}: ${(m ?? []).join(',')}`).join('; ');
        return { success: false, error: `Datos inválidos: ${errors}` };
    }

    const { id, name } = validatedFields.data;
    const normalizedName = name.trim();

    try {
        // Verificar que la sucursal pertenezca a la organización antes de actualizar
        const existingSucursal = await prisma.sucursal.findUnique({ where: { id } });
        if (!existingSucursal || existingSucursal.organizationId !== organizationId) {
            return { success: false, error: "Sucursal no encontrada o no pertenece a tu organización." };
        }

        // Actualizar la sucursal
        const updatedSucursal = await prisma.sucursal.update({
            where: { id: id }, // Usar id directo ya que verificamos pertenencia
            data: {
                name: normalizedName,
                // No actualizamos el orden aquí
            },
        });

        revalidatePath("/configuracion");
        return { success: true, sucursal: updatedSucursal };

    } catch (error) {
         console.error("🔥 ERROR SERVER ACTION (updateSucursal):", error);
         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            // Error de constraint único (organizationId, name)
             return { success: false, error: `El nombre de sucursal \"${normalizedName}\" ya existe en tu organización.` };
        }
        const message = error instanceof Error ? error.message : "Error inesperado.";
        return { success: false, error: `Error al actualizar la sucursal: ${message}` };
    }
}

// --- Acción: deleteSucursal ---
export interface DeleteSucursalState {
    success: boolean;
    error?: string | null;
}

export async function deleteSucursal(prevState: DeleteSucursalState | null, formData: FormData): Promise<DeleteSucursalState> {
    const organizationId = await getOrganizationIdFromSession();
    if (!organizationId) return { success: false, error: "Usuario no autenticado o sin organización." };

    const validatedFields = deleteBranchSchema.safeParse({
        id: formData.get("id"),
    });

     if (!validatedFields.success) return { success: false, error: "ID de sucursal inválido." };
    const { id } = validatedFields.data;

    try {
         // Verificar que la sucursal pertenezca a la organización antes de eliminar
        const existingSucursal = await prisma.sucursal.findUnique({ where: { id } });
        if (!existingSucursal || existingSucursal.organizationId !== organizationId) {
            return { success: false, error: "Sucursal no encontrada o no pertenece a tu organización." };
        }

        // Eliminar la sucursal
        await prisma.sucursal.delete({
            where: { id: id },
        });

        revalidatePath("/configuracion");
        return { success: true };

    } catch (error) {
        console.error("🔥 ERROR SERVER ACTION (deleteSucursal):", error);
         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            // El registro a eliminar no existe
            return { success: false, error: "La sucursal a eliminar no se encontró." };
        }
        const message = error instanceof Error ? error.message : "Error inesperado.";
        return { success: false, error: `Error al eliminar la sucursal: ${message}` };
    }
}


// --- Acción: updateSucursalesOrder ---
export interface UpdateOrderState {
    success: boolean;
    error?: string | null;
}

export async function updateSucursalesOrder(prevState: UpdateOrderState | null, orderedItems: { id: number; order: number }[]): Promise<UpdateOrderState> {
    const organizationId = await getOrganizationIdFromSession();
    if (!organizationId) return { success: false, error: "Usuario no autenticado o sin organización." };

    const validationResult = updateBranchOrderSchema.safeParse(orderedItems);
    if (!validationResult.success) {
        const errors = Object.entries(validationResult.error.flatten().fieldErrors).map(([f, m]) => `${f}: ${(m ?? []).join(',')}`).join('; ');
        return { success: false, error: `Datos de orden inválidos: ${errors}`};
    }

    const updates = validationResult.data;

    try {
        // Verificar que todos los IDs pertenezcan a la organización actual
        const ids = updates.map(item => item.id);
        const count = await prisma.sucursal.count({
            where: {
                id: { in: ids },
                organizationId: organizationId,
            },
        });

        if (count !== ids.length) {
             return { success: false, error: "Una o más sucursales no pertenecen a tu organización." };
        }

        // Ejecutar actualizaciones en transacción
        await prisma.$transaction(
            updates.map(item =>
                prisma.sucursal.update({
                    where: { id: item.id },
                    data: { order: item.order },
                })
            )
        );

        revalidatePath("/configuracion");
        return { success: true };

    } catch (error) {
        console.error("🔥 ERROR SERVER ACTION (updateSucursalesOrder):", error);
        return { success: false, error: "Error al actualizar el orden de las sucursales." };
    }
} 