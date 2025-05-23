"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { type MotorcycleState, Prisma } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";

// Actualizar el tipo para incluir costPrice y wholesalePrice
export type MotorcycleTableRowData = {
  id: number;
  brand: {
    name: string;
    organizationBrands: {
      // Forzar a que sea un array (puede estar vacío)
      color: string | null;
    }[];
  } | null;
  model: {
    name: string;
    // files removido para optimización - lazy loading
  } | null;
  color: { name: string; colorOne: string; colorTwo: string | null } | null;
  branch: { name: string } | null;
  supplier?: { legalName: string; commercialName: string | null } | null;
  year: number;
  displacement: number | null;
  mileage: number;
  retailPrice: number;
  wholesalePrice: number | null;
  costPrice: number | null;
  currency: string;
  state: MotorcycleState;
  chassisNumber: string;
  engineNumber: string | null;
  reservation?: {
    id: number;
    amount: number;
    clientId: string;
    status: string;
    paymentMethod?: string | null;
    notes?: string | null;
  } | null;
};

// Tipos para opciones de filtro
export interface GetMotorcyclesOptions {
  filter?: {
    state?: MotorcycleState[];
    // Añadir más filtros según sea necesario
  };
}

export async function getMotorcycles(
  options: GetMotorcyclesOptions = {},
): Promise<MotorcycleTableRowData[]> {
  noStore();
  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.user?.organizationId;

  if (!organizationId) {
    console.error("getMotorcycles: Usuario no autenticado o sin organización.");
    return [];
  }

  try {
    // 🚀 OPTIMIZACIÓN 1: Query más eficiente con menos joins
    const motorcycles = await prisma.motorcycle.findMany({
      where: { 
        organizationId: organizationId,
        // Filtrar estados eliminados desde la query si es necesario
        ...(options.filter?.state && { state: { in: options.filter.state } })
      },
      select: {
        // 🚀 OPTIMIZACIÓN 2: Solo campos esenciales para la vista inicial
        id: true,
        year: true,
        displacement: true,
        mileage: true,
        retailPrice: true,
        wholesalePrice: true,
        costPrice: true,
        currency: true,
        state: true,
        chassisNumber: true,
        engineNumber: true,
        createdAt: true, // Para ordenamiento
        // Joins optimizados con menos campos
        brand: {
          select: {
            name: true,
            organizationBrands: {
              where: { organizationId: organizationId },
              select: { color: true },
              take: 1, // Solo uno por organización
            },
          },
        },
        model: {
          select: {
            name: true,
            // 🚀 OPTIMIZACIÓN 3: Remover files de query inicial (lazy loading)
          },
        },
        color: { select: { name: true, colorOne: true, colorTwo: true } },
        branch: { select: { name: true } },
        supplier: { select: { legalName: true, commercialName: true } },
        // 🚀 OPTIMIZACIÓN 4: Query más específica para reservaciones
        reservations: {
          select: {
            id: true,
            amount: true,
            clientId: true,
            status: true,
            paymentMethod: true,
            notes: true,
          },
          where: {
            status: "active",
          },
          take: 1,
          orderBy: { createdAt: "desc" }, // Más reciente primero
        },
      },
      // 🚀 OPTIMIZACIÓN 5: Ordenamiento en base de datos
      orderBy: [
        { state: "asc" }, // Estados activos primero
        { createdAt: "desc" }
      ],
      // 🚀 OPTIMIZACIÓN 6: Límite inicial (paginación del lado servidor)
      take: options.filter?.state ? undefined : 100, // Limite inicial para performance
    });

    // Mapear cuidadosamente para asegurar el tipo final
    const formattedMotorcycles: MotorcycleTableRowData[] = motorcycles.map((moto) => {
      // Extraer el color de la marca de forma segura
      const brandColorData = moto.brand?.organizationBrands?.[0]; // Puede ser undefined

      // Construir el objeto brand para el tipo final
      const finalBrand = moto.brand
        ? {
            name: moto.brand.name,
            // Asegurar que organizationBrands sea un array, incluso si está vacío
            organizationBrands: moto.brand.organizationBrands || [],
          }
        : null;

      // Obtener la primera reserva activa (si existe)
      const activeReservation =
        moto.reservations && moto.reservations.length > 0 ? moto.reservations[0] : null;

      return {
        // Campos directos
        id: moto.id,
        year: moto.year,
        displacement: moto.displacement,
        mileage: moto.mileage,
        retailPrice: moto.retailPrice,
        wholesalePrice: moto.wholesalePrice,
        costPrice: moto.costPrice,
        currency: moto.currency,
        state: moto.state,
        chassisNumber: moto.chassisNumber,
        engineNumber: moto.engineNumber,
        // Relaciones (asegurando null si no existen)
        brand: finalBrand,
        model: moto.model
          ? {
              name: moto.model.name,
              // files removido para optimización - se carga bajo demanda
            }
          : null,
        color: moto.color ?? null,
        branch: moto.branch ?? null,
        supplier: moto.supplier ?? undefined,
        // Usar la reserva activa extraída antes
        reservation: activeReservation,
      };
    });

    return formattedMotorcycles;
  } catch (error) {
    console.error("Error obteniendo motocicletas:", error);
    return [];
  }
}
