"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { auth } from "@/auth";
import { headers } from 'next/headers';
import { Prisma } from "@prisma/client";
// Importar schemas de color desde el archivo Zod
import {
    createColorSchema,
    updateColorActionSchema,
    deleteColorSchema,
    updateColorsOrderSchema
} from "@/zod/ColorsZod";

// Helper para obtener organizationId de la sesión (movido aquí)
async function getOrganizationIdFromSession(): Promise<string | null> {
    console.warn("getOrganizationIdFromSession usando placeholder CON ID REAL (para prueba)");
    // ¡CAMBIA ESTE ID POR UNO VÁLIDO EN TU BD!
    const testOrgId = 'clkog97zp0000e8v9h4z8a9b1'; 
    const session = { user: { organizationId: testOrgId }}; 
    return session?.user?.organizationId ?? null;
}

// Definición básica de FormState (reutilizada por varias acciones)
type FormState = {
  success: boolean;
  error?: string | null;
  // Puedes añadir más campos específicos si los usas (e.g., id creado)
  colorId?: number | null; 
};


// ==============================================
// Acciones para Colores (MotoColor) por Organización 
// ==============================================

// --- Acción: createMotoColor ---
export interface CreateColorState extends FormState {} // Hereda de FormState

export async function createMotoColor(prevState: CreateColorState | null, formData: FormData): Promise<CreateColorState> {
    const organizationId = await getOrganizationIdFromSession();
    if (!organizationId) return { success: false, error: "Usuario no autenticado o sin organización." };

    // Limpiar color2 si es null antes de validar
    let color2Value = formData.get("color2");
    if (color2Value === null) {
        formData.delete("color2"); // Zod lo tratará como undefined
    }

    const validatedFields = createColorSchema.safeParse({
        nombre: formData.get("nombre"),
        tipo: formData.get("tipo"),
        color1: formData.get("color1"),
        color2: formData.get("color2"), // Pasa undefined si se eliminó
        organizationId: organizationId, // Usar el de la sesión
    });

    if (!validatedFields.success) {
        const errors = Object.entries(validatedFields.error.flatten().fieldErrors).map(([f, m]) => `${f}: ${(m ?? []).join(',')}`).join('; ');
        console.error("[createMotoColor] Validation Error:", errors, "Input:", Object.fromEntries(formData.entries()));
        return { success: false, error: `Datos inválidos: ${errors}` };
    }

    const { nombre, tipo, color1, color2 } = validatedFields.data;

    try {
        const existing = await prisma.motoColor.findUnique({
             where: { organizationId_nombre: { organizationId, nombre } }
        });
        if (existing) return { success: false, error: `El nombre de color "${nombre}" ya existe en esta organización.` };

        const maxOrderResult = await prisma.motoColor.aggregate({ 
            _max: { order: true },
            where: { organizationId: organizationId }
        });
        const nextOrder = (maxOrderResult._max.order ?? -1) + 1;

        const newColor = await prisma.motoColor.create({
            data: {
                nombre,
                tipo,
                color1,
                color2: tipo === 'SOLIDO' ? null : color2, // Asegurar null si es SOLIDO
                order: nextOrder,
                organizationId: organizationId,
            },
        });

        revalidatePath("/configuracion");
        return { success: true, colorId: newColor.id };
    } catch (error) {
        console.error("🔥 ERROR SERVER ACTION (createMotoColor):", error);
        return { success: false, error: "Error al crear el color." };
    }
}

// --- Acción: updateMotoColor ---
export interface UpdateColorActionState extends FormState {} // Hereda de FormState

export async function updateMotoColor(prevState: UpdateColorActionState | null, formData: FormData): Promise<UpdateColorActionState> {
     const organizationId = await getOrganizationIdFromSession(); 
     if (!organizationId) return { success: false, error: "Usuario no autenticado o sin organización." };

     // Limpiar color2 si es null antes de validar
     let color2Value = formData.get("color2");
     if (color2Value === null) {
         formData.delete("color2"); 
     }

     const validatedFields = updateColorActionSchema.safeParse({
        id: formData.get("id"),
        nombre: formData.get("nombre"),
        tipo: formData.get("tipo"),
        color1: formData.get("color1"),
        color2: formData.get("color2"),
        organizationId: organizationId, 
    });

     if (!validatedFields.success) {
         const errors = Object.entries(validatedFields.error.flatten().fieldErrors).map(([f, m]) => `${f}: ${(m ?? []).join(',')}`).join('; ');
         console.error("[updateMotoColor] Validation Error:", errors, "Input:", Object.fromEntries(formData.entries()));
         return { success: false, error: `Datos inválidos: ${errors}` };
    }

    const { id, nombre, tipo, color1, color2 } = validatedFields.data;

    try {
        const colorToUpdate = await prisma.motoColor.findUnique({
            where: { id },
        });
        
        if (!colorToUpdate) {
            return { success: false, error: "El color a actualizar no se encontró." };
        }
        
        if (colorToUpdate.organizationId !== organizationId) {
            return { success: false, error: "No tienes permiso para editar este color." };
        }
        
        const existingNameColor = await prisma.motoColor.findUnique({
             where: { organizationId_nombre: { organizationId, nombre } }
        });
        if (existingNameColor && existingNameColor.id !== id) {
             return { success: false, error: `El nombre de color "${nombre}" ya existe en esta organización.` };
        }

        await prisma.motoColor.update({
            where: { id }, 
            data: {
                nombre,
                tipo,
                color1,
                color2: tipo === 'SOLIDO' ? null : color2, // Asegurar null si es SOLIDO
            },
        });

        revalidatePath("/configuracion");
        return { success: true };
    } catch (error) {
        console.error("🔥 ERROR SERVER ACTION (updateMotoColor):", error);
         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
             return { success: false, error: "El color a actualizar no se encontró." };
         }
        return { success: false, error: "Error al actualizar el color." };
    }
}

// --- Acción: deleteMotoColor ---
export interface DeleteColorState extends FormState {} // Hereda de FormState

export async function deleteMotoColor(prevState: DeleteColorState | null, formData: FormData): Promise<DeleteColorState> {
    const organizationId = await getOrganizationIdFromSession();
    if (!organizationId) return { success: false, error: "Usuario no autenticado o sin organización." };

    const validatedFields = deleteColorSchema.safeParse({ 
        id: formData.get("id"),
    });

    if (!validatedFields.success) return { success: false, error: "ID inválido." };
    const { id } = validatedFields.data;

    try {
        const colorToDelete = await prisma.motoColor.findUnique({
            where: { id },
        });
        
        if (!colorToDelete) {
            return { success: false, error: "El color a eliminar no se encontró." };
        }
        
        if (colorToDelete.organizationId !== organizationId) {
            return { success: false, error: "No tienes permiso para eliminar este color." };
        }
        
        await prisma.motoColor.delete({ where: { id } });
        revalidatePath("/configuracion");
        return { success: true };
    } catch (error) {
         console.error("🔥 ERROR SERVER ACTION (deleteMotoColor):", error);
         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
             return { success: false, error: "El color a eliminar no se encontró." };
         }
        return { success: false, error: "Error al eliminar el color." };
    }
}

// --- Acción: updateMotoColorsOrder ---
export interface UpdateColorsOrderState extends FormState {} // Hereda de FormState

export async function updateMotoColorsOrder(
    prevState: UpdateColorsOrderState | null, 
    payload: { colors: { id: number; order: number }[], organizationId: string } // Espera el payload completo
): Promise<UpdateColorsOrderState> {
    const organizationId = await getOrganizationIdFromSession();
    if (!organizationId || payload.organizationId !== organizationId) { // Validar ID de sesión vs payload
        return { success: false, error: "No autorizado o ID de organización no coincide." };
    }

    // Usar schema importado (solo valida la estructura de 'colors')
    const validatedData = updateColorsOrderSchema.safeParse(payload);
    if (!validatedData.success) {
        const errors = Object.entries(validatedData.error.flatten().fieldErrors).map(([f, m]) => `${f}: ${(m ?? []).join(',')}`).join('; ');
        console.error("[updateMotoColorsOrder] Validation Error:", errors, "Input:", payload);
        return { success: false, error: `Datos de orden inválidos: ${errors}` };
    }

    const { colors } = validatedData.data; // Obtener solo 'colors' ya que organizationId ya se validó

    try {
        const colorIds = colors.map(c => c.id);
        const existingColors = await prisma.motoColor.findMany({
            where: {
                id: { in: colorIds },
                organizationId: organizationId // Validar pertenencia a la organización
            },
            select: { id: true }
        });
        
        if (existingColors.length !== colorIds.length) {
             console.error(`[updateMotoColorsOrder] Color mismatch: Found ${existingColors.length}/${colorIds.length} colors for Org ${organizationId}`);
             return { success: false, error: "Error: Uno o más colores no pertenecen a tu organización." };
        }
                
        const updates = colors.map(item =>
            prisma.motoColor.update({ 
                where: { id: item.id, organizationId: organizationId }, // Asegurar doblemente la pertenencia
                data: { order: item.order } 
            })
        );

        await prisma.$transaction(updates);
        revalidatePath("/configuracion");
        return { success: true };
    } catch (error) {
        console.error("🔥 ERROR SERVER ACTION (updateMotoColorsOrder):", error);
         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
             return { success: false, error: "Error: Uno de los colores no se encontró." };
         }
        return { success: false, error: "Error al actualizar orden de colores." };
    }
} 