"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import type { MotorcycleState } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { headers } from "next/headers";

// 🚀 OPTIMIZACIÓN 1: Tipo simplificado para la vista inicial
export type MotorcycleTableOptimized = {
  id: number;
  brand: { name: string; color: string | null } | null;
  model: { name: string } | null;
  color: { name: string; colorOne: string; colorTwo: string | null } | null;
  branch: { name: string } | null;
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
  } | null;
};

export interface GetMotorcyclesOptimizedOptions {
  filter?: {
    state?: MotorcycleState[];
    limit?: number;
  };
  includeReservations?: boolean;
}

// 🚀 OPTIMIZACIÓN 2: Cache para datos frecuentemente accedidos
const getCachedMotorcycles = unstable_cache(
  async (organizationId: string, states?: MotorcycleState[], limit?: number) => {
    return await prisma.motorcycle.findMany({
      where: { 
        organizationId,
        ...(states && { state: { in: states } })
      },
      select: {
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
        // Solo datos esenciales de marca
        brand: {
          select: {
            name: true,
            organizationBrands: {
              where: { organizationId },
              select: { color: true },
              take: 1,
            },
          },
        },
        // Solo nombre del modelo
        model: {
          select: { name: true },
        },
        color: { 
          select: { name: true, colorOne: true, colorTwo: true } 
        },
        branch: { 
          select: { name: true } 
        },
        // Solo reservas activas si es necesario
        reservations: {
          select: {
            id: true,
            amount: true,
            clientId: true,
            status: true,
          },
          where: { status: "active" },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [
        { state: "asc" }, // Estados activos primero
        { createdAt: "desc" }
      ],
      ...(limit && { take: limit }),
    });
  },
  ['motorcycles-optimized'],
  { 
    revalidate: 60, // Cache por 1 minuto
    tags: ['motorcycles'] 
  }
);

// 🚀 OPTIMIZACIÓN 3: Action optimizado
export async function getMotorcyclesOptimized(
  options: GetMotorcyclesOptimizedOptions = {},
): Promise<MotorcycleTableOptimized[]> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const organizationId = session?.user?.organizationId;

    if (!organizationId) {
      console.error("getMotorcyclesOptimized: Usuario no autenticado o sin organización.");
      return [];
    }

    // Usar cache para datos frecuentes
    const motorcycles = await getCachedMotorcycles(
      organizationId,
      options.filter?.state,
      options.filter?.limit
    );

    // 🚀 OPTIMIZACIÓN 4: Transformación más eficiente
    return motorcycles.map((moto) => ({
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
      // Simplificar datos de marca
      brand: moto.brand
        ? {
            name: moto.brand.name,
            color: moto.brand.organizationBrands[0]?.color || null,
          }
        : null,
      model: moto.model,
      color: moto.color,
      branch: moto.branch,
      // Solo primera reserva activa
      reservation: moto.reservations?.[0] || null,
    }));
  } catch (error) {
    console.error("Error obteniendo motocicletas optimizado:", error);
    return [];
  }
}

// 🚀 OPTIMIZACIÓN 5: Function para invalidar cache cuando sea necesario
export async function invalidateMotorcyclesCache() {
  // Esta función se llamaría cuando se actualicen motocicletas
  // para invalidar el cache
} 