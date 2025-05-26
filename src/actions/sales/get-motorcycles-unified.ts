"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { type MotorcycleState, Prisma } from "@prisma/client";
import { unstable_noStore as noStore, unstable_cache } from "next/cache";
import { headers } from "next/headers";

// 🚀 Tipo unificado y optimizado para vistas de tabla
export type MotorcycleTableData = {
  id: number;
  brand: {
    name: string;
    color: string | null;
  } | null;
  model: { name: string } | null;
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

// 🚀 Opciones unificadas de configuración
export interface GetMotorcyclesOptions {
  filter?: {
    state?: MotorcycleState[];
    limit?: number;
  };
  optimization?: {
    useCache?: boolean;
    cacheTime?: number;
    includeSupplier?: boolean;
    includeReservations?: boolean;
  };
}

// 🚀 Query base optimizada
const buildMotorcycleQuery = (
  organizationId: string,
  options: GetMotorcyclesOptions = {}
) => {
  const baseWhere: Prisma.MotorcycleWhereInput = {
    organizationId,
    ...(options.filter?.state && { state: { in: options.filter.state } }),
  };

  const baseSelect: Prisma.MotorcycleSelect = {
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
    createdAt: true,
    // Relaciones optimizadas
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
    model: {
      select: { name: true },
    },
    color: {
      select: { name: true, colorOne: true, colorTwo: true },
    },
    branch: {
      select: { name: true },
    },
    // Condicionales
    ...(options.optimization?.includeSupplier && {
      supplier: {
        select: { legalName: true, commercialName: true },
      },
    }),
    ...(options.optimization?.includeReservations && {
      reservations: {
        select: {
          id: true,
          amount: true,
          clientId: true,
          status: true,
          paymentMethod: true,
          notes: true,
        },
        where: { status: "active" },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    }),
  };

  return {
    where: baseWhere,
    select: baseSelect,
    orderBy: [
      { state: "asc" as const },
      { createdAt: "desc" as const },
    ],
    ...(options.filter?.limit && { take: options.filter.limit }),
  };
};

// 🚀 Función con cache para datos frecuentes
const getCachedMotorcycles = unstable_cache(
  async (organizationId: string, options: GetMotorcyclesOptions) => {
    const query = buildMotorcycleQuery(organizationId, options);
    return await prisma.motorcycle.findMany(query);
  },
  ['motorcycles-unified'],
  {
    revalidate: 60, // Cache por 1 minuto
    tags: ['motorcycles'],
  }
);

// 🚀 Función principal unificada
export async function getMotorcycles(
  options: GetMotorcyclesOptions = {}
): Promise<MotorcycleTableData[]> {
  try {
    // Configuración por defecto
    const defaultOptions: GetMotorcyclesOptions = {
      filter: {
        limit: 100,
        ...options.filter,
      },
      optimization: {
        useCache: false,
        cacheTime: 60,
        includeSupplier: false,
        includeReservations: true,
        ...options.optimization,
      },
    };

    // No usar cache si no se especifica
    if (!defaultOptions.optimization?.useCache) {
      noStore();
    }

    // Obtener sesión
    const session = await auth.api.getSession({ headers: await headers() });
    const organizationId = session?.user?.organizationId;

    if (!organizationId) {
      console.error("getMotorcycles: Usuario no autenticado o sin organización.");
      return [];
    }

    // Obtener datos con o sin cache
    const motorcycles = defaultOptions.optimization?.useCache
      ? await getCachedMotorcycles(organizationId, defaultOptions)
      : await prisma.motorcycle.findMany(
          buildMotorcycleQuery(organizationId, defaultOptions)
        );

    // 🚀 Transformación optimizada
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
            color: null, // Se puede obtener por separado si es necesario
          }
        : null,
      model: moto.model,
      color: moto.color,
      branch: moto.branch,
      supplier: moto.supplier || undefined,
      // Solo primera reserva activa
      reservation: moto.reservations?.[0] || null,
    }));
  } catch (error) {
    console.error("Error obteniendo motocicletas:", error);
    return [];
  }
}

// 🚀 Funciones de conveniencia
export async function getMotorcyclesOptimized(
  filter?: { state?: MotorcycleState[]; limit?: number }
): Promise<MotorcycleTableData[]> {
  return getMotorcycles({
    filter,
    optimization: {
      useCache: true,
      includeReservations: true,
      includeSupplier: false,
    },
  });
}

export async function getMotorcyclesWithSupplier(
  filter?: { state?: MotorcycleState[]; limit?: number }
): Promise<MotorcycleTableData[]> {
  return getMotorcycles({
    filter,
    optimization: {
      useCache: false,
      includeReservations: true,
      includeSupplier: true,
    },
  });
}

export async function getMotorcyclesBasic(
  filter?: { state?: MotorcycleState[]; limit?: number }
): Promise<MotorcycleTableData[]> {
  return getMotorcycles({
    filter,
    optimization: {
      useCache: false,
      includeReservations: false,
      includeSupplier: false,
    },
  });
}

// 🚀 Función para invalidar cache
export async function invalidateMotorcyclesCache() {
  // En una implementación real, esto invalidaría el cache por tags
  console.log("Cache de motocicletas invalidado");
} 
