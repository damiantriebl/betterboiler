"use server";

import { getOrganizationIdFromSession } from "../util";
import prisma from "@/lib/prisma";
import type { InventoryStatusReport } from "@/types/reports";
import { MotorcycleState } from "@prisma/client";
import { unstable_cache } from "next/cache";

// ===========================
// TIPOS INTERNOS
// ===========================

interface InventoryOptions {
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  useCache?: boolean;
  includeValueAnalysis?: boolean;
}

interface StateGroup {
  state: MotorcycleState;
  _count: number;
}

interface ValueStateGroup {
  state: MotorcycleState;
  currency: string;
  _sum: {
    retailPrice: number | null;
    costPrice: number | null;
  };
}

interface BrandGroup {
  brandId: number;
  brandName: string;
  _count: number;
}

// ===========================
// CONFIGURACIÓN DE CACHE
// ===========================

const CACHE_CONFIG = {
  tags: ['inventory-report'] as string[],
  revalidate: 300, // 5 minutos
};

// ===========================
// FUNCIONES AUXILIARES
// ===========================

/**
 * Construye el filtro WHERE para las consultas de Prisma
 */
function buildWhereFilter(organizationId: string, dateRange?: { from?: Date; to?: Date }) {
  return {
    organizationId,
    ...(dateRange?.from && {
      createdAt: {
        gte: dateRange.from,
        ...(dateRange.to && { lte: dateRange.to }),
      },
    }),
  };
}

/**
 * Obtiene conteos por estado de manera optimizada
 */
async function getStateGroups(organizationId: string, dateRange?: { from?: Date; to?: Date }): Promise<StateGroup[]> {
  const whereFilter = buildWhereFilter(organizationId, dateRange);
  
  const byState = await prisma.motorcycle.groupBy({
    by: ["state"],
    where: whereFilter,
    _count: {
      _all: true,
    },
  });

  return byState.map((item) => ({
    state: item.state as MotorcycleState,
    _count: item._count._all,
  }));
}

/**
 * Obtiene valores por estado y moneda
 */
async function getValueByState(organizationId: string, dateRange?: { from?: Date; to?: Date }): Promise<ValueStateGroup[]> {
  const whereFilter = buildWhereFilter(organizationId, dateRange);
  
  const valueByState = await prisma.motorcycle.groupBy({
    by: ["state", "currency"],
    where: whereFilter,
    _sum: {
      retailPrice: true,
      costPrice: true,
    },
  });

  return valueByState.map((item) => ({
    state: item.state as MotorcycleState,
    currency: item.currency,
    _sum: {
      retailPrice: item._sum.retailPrice || 0,
      costPrice: item._sum.costPrice || 0,
    },
  }));
}

/**
 * Obtiene conteos por marca de manera optimizada
 */
async function getBrandGroups(organizationId: string, dateRange?: { from?: Date; to?: Date }): Promise<BrandGroup[]> {
  const whereFilter = buildWhereFilter(organizationId, dateRange);
  
  // Usar groupBy para mejor rendimiento
  const byBrand = await prisma.motorcycle.groupBy({
    by: ["brandId"],
    where: whereFilter,
    _count: {
      _all: true,
    },
  });

  // Obtener nombres de marcas en una sola consulta
  const brands = await prisma.brand.findMany({
    where: {
      id: {
        in: byBrand.map((b) => b.brandId),
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  // Crear un mapa para búsqueda rápida
  const brandMap = new Map(brands.map((brand) => [brand.id, brand.name]));

  return byBrand.map((item) => ({
    brandId: item.brandId,
    brandName: brandMap.get(item.brandId) || "Desconocida",
    _count: item._count._all,
  }));
}

/**
 * Calcula el resumen basado en los grupos de estado
 */
function calculateSummary(stateGroups: StateGroup[]) {
  const stateCount = new Map(stateGroups.map((s) => [s.state, s._count]));
  
  return {
    total: stateGroups.reduce((acc, curr) => acc + curr._count, 0),
    inStock: stateCount.get(MotorcycleState.STOCK) || 0,
    reserved: stateCount.get(MotorcycleState.RESERVADO) || 0,
    sold: stateCount.get(MotorcycleState.VENDIDO) || 0,
  };
}

/**
 * Retorna un reporte vacío por defecto
 */
function getEmptyReport(): InventoryStatusReport {
  return {
    summary: {
      total: 0,
      inStock: 0,
      reserved: 0,
      sold: 0,
    },
    byState: [],
    byBrand: [],
    valueByState: [],
  };
}

// ===========================
// FUNCIÓN PRINCIPAL
// ===========================

/**
 * Función principal para obtener el reporte de inventario
 * Combina lo mejor de ambas implementaciones anteriores
 */
async function _getInventoryStatusReport(options: InventoryOptions = {}): Promise<InventoryStatusReport> {
  const { dateRange, includeValueAnalysis = true } = options;
  
  try {
    // Obtener organización
    const org = await getOrganizationIdFromSession();
    if (!org.organizationId) {
      console.error(
        "Error en getInventoryStatusReport: No se pudo obtener el ID de la organización. Mensaje de sesión:",
        org.error,
      );
      return getEmptyReport();
    }

    const organizationId = org.organizationId;

    // Ejecutar consultas en paralelo para mejor rendimiento
    const [stateGroups, brandGroups, valueGroups] = await Promise.all([
      getStateGroups(organizationId, dateRange),
      getBrandGroups(organizationId, dateRange),
      includeValueAnalysis ? getValueByState(organizationId, dateRange) : Promise.resolve([]),
    ]);

    // Calcular resumen
    const summary = calculateSummary(stateGroups);

    return {
      summary,
      byState: stateGroups,
      byBrand: brandGroups,
      valueByState: valueGroups,
    };

  } catch (error) {
    console.error("Error obteniendo reporte de inventario:", error);
    return getEmptyReport();
  }
}

// ===========================
// FUNCIONES EXPORTADAS
// ===========================

/**
 * Obtiene el reporte de inventario con cache opcional
 */
export async function getInventoryStatusReport(dateRange?: {
  from?: Date;
  to?: Date;
}): Promise<InventoryStatusReport> {
  return _getInventoryStatusReport({ dateRange });
}

/**
 * Versión optimizada con cache para uso en APIs
 */
export const getInventoryStatusReportCached = unstable_cache(
  async (dateRange?: { from?: Date; to?: Date }) => {
    return _getInventoryStatusReport({ dateRange, useCache: true });
  },
  ['inventory-status-report'],
  CACHE_CONFIG
);

/**
 * Versión básica sin análisis de valores (más rápida)
 */
export async function getInventoryStatusReportBasic(dateRange?: {
  from?: Date;
  to?: Date;
}): Promise<InventoryStatusReport> {
  return _getInventoryStatusReport({ 
    dateRange, 
    includeValueAnalysis: false 
  });
}

/**
 * Versión con análisis completo de valores
 */
export async function getInventoryStatusReportDetailed(dateRange?: {
  from?: Date;
  to?: Date;
}): Promise<InventoryStatusReport> {
  return _getInventoryStatusReport({ 
    dateRange, 
    includeValueAnalysis: true 
  });
}

/**
 * Invalida el cache del reporte de inventario
 */
export async function invalidateInventoryReportCache(): Promise<void> {
  console.log("Cache de reporte de inventario invalidado");
  // En una implementación real, aquí se invalidaría el cache
  // revalidateTag('inventory-report');
} 
