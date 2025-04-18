"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { unstable_noStore as noStore } from 'next/cache';
import { EstadoVenta } from "@/types/BikesType";

// Tipo específico y preciso para la tabla
export type MotorcycleTableRowData = {
    id: number;
    brand: {
        name: string;
        organizationBrands: { // Forzar a que sea un array (puede estar vacío)
            color: string | null;
        }[]; 
    } | null;
    model: { name: string } | null;
    color: { name: string; colorOne: string; colorTwo: string | null } | null;
    branch: { name: string } | null;
    supplier?: { legalName: string; commercialName: string | null } | null;
    year: number;
    displacement: number | null;
    mileage: number;
    retailPrice: number;
    currency: string;
    estadoVenta: EstadoVenta;
};

interface GetMotorcyclesOptions {}

export async function getMotorcycles(options: GetMotorcyclesOptions = {}): Promise<MotorcycleTableRowData[]> {
    noStore();
    const session = await auth.api.getSession({ headers: await headers() });
    const organizationId = session?.user?.organizationId;

    if (!organizationId) {
        console.error("getMotorcycles: Usuario no autenticado o sin organización.");
        return [];
    }

    try {
        const motorcycles = await prisma.motorcycle.findMany({
            where: { organizationId: organizationId },
            select: { // Seleccionar explícitamente
                id: true,
                year: true,
                displacement: true,
                mileage: true,
                retailPrice: true,
                currency: true,
                state: true,
                brand: { // Incluir marca y su relación OrganizationBrand
                    select: {
                        name: true,
                        organizationBrands: { // Incluir explícitamente la relación
                            where: { organizationId: organizationId },
                            select: { color: true },
                            // No usar take: 1 aquí, traer el array (aunque debería ser de 1)
                        }
                    }
                },
                model: { select: { name: true } },
                color: { select: { name: true, colorOne: true, colorTwo: true } },
                branch: { select: { name: true } },
                supplier: { select: { legalName: true, commercialName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Mapear cuidadosamente para asegurar el tipo final
        const formattedMotorcycles: MotorcycleTableRowData[] = motorcycles.map(moto => {
             // Extraer el color de la marca de forma segura
             const brandColorData = moto.brand?.organizationBrands?.[0]; // Puede ser undefined
             
             // Construir el objeto brand para el tipo final
             const finalBrand = moto.brand ? {
                 name: moto.brand.name,
                 // Asegurar que organizationBrands sea un array, incluso si está vacío
                 organizationBrands: moto.brand.organizationBrands || [] 
             } : null;

            return {
                // Campos directos
                id: moto.id,
                year: moto.year,
                displacement: moto.displacement,
                mileage: moto.mileage,
                retailPrice: moto.retailPrice,
                currency: moto.currency,
                estadoVenta: moto.state as EstadoVenta,
                // Relaciones (asegurando null si no existen)
                brand: finalBrand,
                model: moto.model ?? null,
                color: moto.color ?? null,
                branch: moto.branch ?? null,
                supplier: moto.supplier ?? undefined,
            };
        });

        return formattedMotorcycles;

    } catch (error) {
        console.error("Error obteniendo motocicletas:", error);
        return [];
    }
} 