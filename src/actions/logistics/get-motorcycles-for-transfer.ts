"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import type { MotorcycleForTransfer } from "@/types/logistics";
import { headers } from "next/headers";
import { getOrganizationIdFromSession } from "../util";

// Types
export interface MotorcyclesForTransferResult {
  success: boolean;
  error?: string;
  motorcycles: MotorcycleForTransfer[];
}

// Validar acceso a organización
async function validateOrganizationAccess() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    return null;
  }

  const organizationAccess = await getOrganizationIdFromSession();
  if (!organizationAccess || organizationAccess.error || !organizationAccess.organizationId) {
    return null;
  }

  return {
    userId: session.user.id,
    organizationId: organizationAccess.organizationId,
  };
}

// Obtener motocicletas disponibles para transferencia
export async function getMotorcyclesForTransfer(filters?: {
  branchId?: number;
  search?: string;
}): Promise<MotorcyclesForTransferResult> {
  try {
    const orgAccess = await validateOrganizationAccess();
    if (!orgAccess) {
      return { success: false, error: "Usuario no autenticado.", motorcycles: [] };
    }

    // Construir condiciones de filtrado
    const whereConditions: any = {
      organizationId: orgAccess.organizationId,
      state: "STOCK", // Solo motos en stock pueden ser transferidas
    };

    // Filtrar por sucursal si se especifica
    if (filters?.branchId) {
      whereConditions.branchId = filters.branchId;
    }

    // Filtrar por búsqueda si se especifica
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      whereConditions.OR = [
        { chassisNumber: { contains: search, mode: "insensitive" as const } },
        { brand: { name: { contains: search, mode: "insensitive" as const } } },
        { model: { name: { contains: search, mode: "insensitive" as const } } },
      ];
    }

    // Obtener motos que no tienen transferencias activas
    const motorcycles = await prisma.motorcycle.findMany({
      where: {
        ...whereConditions,
        transfers: {
          none: {
            status: { in: ["REQUESTED", "CONFIRMED", "IN_TRANSIT"] },
          },
        },
      },
      select: {
        id: true,
        chassisNumber: true,
        year: true,
        retailPrice: true,
        currency: true,
        state: true,
        imageUrl: true,
        brand: {
          select: {
            name: true,
          },
        },
        model: {
          select: {
            name: true,
          },
        },
        color: {
          select: {
            name: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { brand: { name: "asc" } },
        { model: { name: "asc" } },
        { year: "desc" },
        { chassisNumber: "asc" },
      ],
    });

    return { success: true, motorcycles };
  } catch (error) {
    console.error("Error obteniendo motocicletas para transferencia:", error);
    return {
      success: false,
      error: "Error al obtener motocicletas para transferencia.",
      motorcycles: [],
    };
  }
}

// Obtener motocicletas por sucursal para transferencia
export async function getMotorcyclesByBranch(
  branchId: number,
): Promise<MotorcyclesForTransferResult> {
  return getMotorcyclesForTransfer({ branchId });
}

// Obtener estadísticas de motocicletas por sucursal
export async function getMotorcycleStatsByBranch(): Promise<{
  success: boolean;
  error?: string;
  stats: Array<{ branchId: number; branchName: string; motorcycleCount: number }>;
}> {
  try {
    const orgAccess = await validateOrganizationAccess();
    if (!orgAccess) {
      return { success: false, error: "Usuario no autenticado.", stats: [] };
    }

    const stats = await prisma.branch.findMany({
      where: { organizationId: orgAccess.organizationId },
      include: {
        _count: {
          select: {
            motorcycles: {
              where: {
                state: "STOCK",
                transfers: {
                  none: {
                    status: { in: ["REQUESTED", "CONFIRMED", "IN_TRANSIT"] },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const result = stats.map((branch) => ({
      branchId: branch.id,
      branchName: branch.name,
      motorcycleCount: branch._count.motorcycles,
    }));

    return { success: true, stats: result };
  } catch (error) {
    console.error("Error obteniendo estadísticas de motocicletas:", error);
    return {
      success: false,
      error: "Error al obtener estadísticas de motocicletas.",
      stats: [],
    };
  }
}
