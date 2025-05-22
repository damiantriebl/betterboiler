'use server';

import prisma from "@/lib/prisma";

// Reutiliza o define el tipo User aquí si es necesario, o impórtalo de @/types
interface User {
    id: string;
    name: string;
    role: string;
}

export async function getUsersForOrganizationAction(organizationId: string): Promise<User[]> {
    if (!organizationId) {
        console.error("getUsersForOrganizationAction: organizationId is required");
        return [];
    }
    try {
        const users = await prisma.user.findMany({
            where: { organizationId },
            select: {
                id: true,
                name: true,
                role: true,
            },
            orderBy: { name: "asc" },
        });
        return users;
    } catch (error) {
        console.error("Error in getUsersForOrganizationAction:", error);
        return [];
    }
} 