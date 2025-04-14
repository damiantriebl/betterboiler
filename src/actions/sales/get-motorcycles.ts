"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { Prisma, Motorcycle } from "@prisma/client";
import { headers } from "next/headers";

// Definir un tipo más completo para la tabla, incluyendo relaciones
export type MotorcycleWithDetails = Motorcycle & {
    brand: { name: string };
    model: { name: string };
    color: { nombre: string; color1: string; color2: string | null };
    branch: { name: string };
    supplier?: { legalName: string; commercialName: string | null } | null; // Proveedor opcional
};

// Podríamos añadir parámetros de filtro aquí en el futuro
interface GetMotorcyclesOptions {
    // status?: string | string[];
    // brandId?: number;
    // searchTerm?: string;
    // ... otros filtros
}

export async function getMotorcycles(options: GetMotorcyclesOptions = {}): Promise<MotorcycleWithDetails[]> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.organizationId) {
        console.error("getMotorcycles: Usuario no autenticado o sin organización.");
        return [];
    }
    const organizationId = session.user.organizationId;

    try {
        // Construir condiciones de Prisma basadas en options (por ahora solo organizationId)
        const whereClause: Prisma.MotorcycleWhereInput = {
            organizationId: organizationId,
            // Añadir más condiciones basadas en options aquí
            // Ejemplo: status: options.status ? (Array.isArray(options.status) ? { in: options.status } : options.status) : undefined,
        };

        const motorcycles = await prisma.motorcycle.findMany({
            where: whereClause,
            include: { // Incluir datos relacionados necesarios para la tabla
                brand: { select: { name: true } },
                model: { select: { name: true } },
                color: { select: { nombre: true, color1: true, color2: true } },
                branch: { select: { name: true } },
                supplier: { select: { legalName: true, commercialName: true } }, // Incluir proveedor
            },
            orderBy: { // Ordenar por defecto
                createdAt: 'desc',
            },
        });

        // Asegurar que el tipo devuelto coincida con MotorcycleWithDetails
        return motorcycles as MotorcycleWithDetails[];

    } catch (error) {
        console.error("Error obteniendo motocicletas:", error);
        return [];
    }
} 