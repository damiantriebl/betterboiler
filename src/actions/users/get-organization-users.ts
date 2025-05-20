"use server";

import prisma from "@/lib/prisma";

interface GetOrganizationUsersParams {
    organizationId: string;
}

// Define un tipo para el usuario devuelto, seleccionando solo los campos necesarios
export interface OrganizationUser {
    id: string;
    name: string | null;
    email: string | null; // email es string, no string | null en el schema de User, pero lo dejamos opcional por si acaso
}

export async function getOrganizationUsers(
    params: GetOrganizationUsersParams
): Promise<{ success: boolean; users?: OrganizationUser[]; error?: string }> {
    const { organizationId } = params;

    if (!organizationId) {
        return { success: false, error: "ID de organización no proporcionado." };
    }

    try {
        const users = await prisma.user.findMany({
            where: {
                organizationId: organizationId,
            },
            select: {
                id: true,
                name: true,
                email: true,
            },
            orderBy: {
                name: 'asc', // Opcional: ordenar por nombre
            },
        });

        return { success: true, users };

    } catch (error) {
        console.error("Error fetching organization users:", error);
        const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido";
        return {
            success: false,
            error: `Error al obtener los usuarios de la organización: ${errorMessage}`,
        };
    }
} 