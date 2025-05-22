"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { UpdatePettyCashMovementSchema, type UpdatePettyCashMovementFormValues } from "@/zod/pettyCashSchema";
import { getOrganizationIdFromSession } from "@/actions/get-Organization-Id-From-Session";
import type { Prisma } from '@prisma/client';

interface UpdatePettyCashMovementResult {
    success: boolean;
    error?: string;
    message?: string;
    data?: UpdatePettyCashMovementFormValues;
    fieldErrors?: Partial<Record<keyof UpdatePettyCashMovementFormValues, string[]>>;
}

export async function updatePettyCashMovement(
    data: UpdatePettyCashMovementFormValues
): Promise<UpdatePettyCashMovementResult> {
    const sessionData = await getOrganizationIdFromSession();
    if (sessionData.error || !sessionData.organizationId || !sessionData.userId || !sessionData.userRole) {
        return { success: false, error: sessionData.error || "No se pudo obtener la información de la sesión o falta información esencial." };
    }

    const { organizationId, userRole } = sessionData;

    const allowedRoles = ["ADMIN", "ROOT", "CASH_MANAGER"];
    if (!allowedRoles.includes(userRole)) {
        return { success: false, error: "Acceso denegado. No tienes permiso para realizar esta acción." };
    }

    const validationResult = UpdatePettyCashMovementSchema.safeParse(data);

    if (!validationResult.success) {
        return {
            success: false,
            error: "Datos de entrada inválidos.", 
            fieldErrors: validationResult.error.flatten().fieldErrors as Partial<Record<keyof UpdatePettyCashMovementFormValues, string[]>>,
        };
    }

    const { movementId, amount, description, ticketNumber, receiptUrl } = validationResult.data;

    try {
        const movementToUpdate = await prisma.pettyCashSpend.findUnique({
            where: { id: movementId },
            include: { withdrawal: { select: { organizationId: true } } }
        });

        if (!movementToUpdate) {
            return { success: false, error: "Gasto no encontrado." };
        }

        if (movementToUpdate.withdrawal.organizationId !== organizationId) {
            return { success: false, error: "Acceso denegado. Este gasto no pertenece a tu organización." };
        }

        const dataForUpdate: Prisma.PettyCashSpendUpdateInput = {
            amount: amount,
        };

        if (description !== undefined) {
            dataForUpdate.description = description;
        }
        if (ticketNumber !== undefined) {
            dataForUpdate.motive = ticketNumber;
        }
        if (receiptUrl !== undefined) {
            dataForUpdate.ticketUrl = receiptUrl;
        }

        const updatedMovement = await prisma.pettyCashSpend.update({
            where: { id: movementId },
            data: dataForUpdate,
        });

        revalidatePath("/(app)/petty-cash", "page");

        return {
            success: true,
            message: "Gasto actualizado correctamente.",
            data: validationResult.data,
        };

    } catch (error) {
        console.error("Error updating petty cash spend:", error);
        const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido";
        return {
            success: false,
            error: `Error al actualizar el gasto: ${errorMessage}`,
        };
    }
} 