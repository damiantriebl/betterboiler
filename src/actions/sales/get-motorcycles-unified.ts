"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import type { MotorcycleState, Prisma } from "@prisma/client";
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
    search?: string;
  };
  optimization?: {
    useCache?: boolean;
    cacheTime?: number;
    includeSupplier?: boolean;
    includeReservations?: boolean;
  };
  pagination?: {
    page: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  };
}

// 🚀 Resultado con paginación
export interface MotorcyclesPaginatedResult {
  data: MotorcycleTableData[];
  total: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

// 🚀 Tipo para el resultado de la query con select
type MotorcycleQueryResult = {
  id: number;
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
  createdAt: Date;
  brand: {
    name: string;
    organizationBrands: { color: string | null }[];
  } | null;
  model: { name: string } | null;
  color: { name: string; colorOne: string; colorTwo: string | null } | null;
  branch: { name: string } | null;
  supplier?: { legalName: string; commercialName: string | null } | null;
  reservations?: {
    id: number;
    amount: number;
    clientId: string;
    status: string;
    paymentMethod: string | null;
    notes: string | null;
  }[];
};

// 🚀 Query base optimizada MEJORADA
const buildMotorcycleQuery = (organizationId: string, options: GetMotorcyclesOptions = {}) => {
  const baseWhere: Prisma.MotorcycleWhereInput = {
    organizationId,
    ...(options.filter?.state && { state: { in: options.filter.state } }),
  };

  // ✨ FUZZY SEARCH: Implementar búsqueda inteligente con PostgreSQL
  if (options.filter?.search?.trim()) {
    const searchTerm = options.filter.search.trim();

    // Crear condiciones de búsqueda fuzzy usando operadores de PostgreSQL
    baseWhere.OR = [
      // Búsqueda exacta primero (mayor relevancia)
      {
        brand: {
          name: {
            equals: searchTerm,
            mode: "insensitive" as const,
          },
        },
      },
      {
        model: {
          name: {
            equals: searchTerm,
            mode: "insensitive" as const,
          },
        },
      },
      // Búsqueda con ILIKE (contains) para coincidencias parciales
      {
        brand: {
          name: {
            contains: searchTerm,
            mode: "insensitive" as const,
          },
        },
      },
      {
        model: {
          name: {
            contains: searchTerm,
            mode: "insensitive" as const,
          },
        },
      },
      {
        chassisNumber: {
          contains: searchTerm,
          mode: "insensitive" as const,
        },
      },
      {
        engineNumber: {
          contains: searchTerm,
          mode: "insensitive" as const,
        },
      },
      // Búsqueda en color
      {
        color: {
          name: {
            contains: searchTerm,
            mode: "insensitive" as const,
          },
        },
      },
      // Búsqueda en sucursal
      {
        branch: {
          name: {
            contains: searchTerm,
            mode: "insensitive" as const,
          },
        },
      },
    ];
  }

  // 🚀 OPTIMIZACIÓN: Select mínimo requerido para mejor performance
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

    // 🚀 OPTIMIZACIÓN: Relaciones mínimas con selects específicos
    brand: {
      select: {
        name: true,
        // Removido organizationBrands para mejor performance - se puede obtener por separado si es necesario
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
  };

  // Agregar campos condicionales solo si son necesarios
  if (options.optimization?.includeSupplier) {
    baseSelect.supplier = {
      select: { legalName: true, commercialName: true },
    };
  }

  if (options.optimization?.includeReservations) {
    baseSelect.reservations = {
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
    };
  }

  // 🚀 OPTIMIZACIÓN: Configurar ordenamiento eficiente
  let orderBy: Prisma.MotorcycleOrderByWithRelationInput[] = [
    { state: "asc" as const },
    { id: "desc" as const }, // Usar id en lugar de createdAt para mejor performance con índices
  ];

  if (options.pagination?.sortBy) {
    const sortField = options.pagination.sortBy;
    const sortOrder = options.pagination.sortOrder || "desc";

    // 🚀 OPTIMIZACIÓN: Mapear campos de ordenamiento optimizados
    switch (sortField) {
      case "year":
        orderBy = [{ year: sortOrder }, { id: "desc" }]; // Agregar id como tiebreaker
        break;
      case "retailPrice":
        orderBy = [{ retailPrice: sortOrder }, { id: "desc" }];
        break;
      case "state":
        orderBy = [{ state: sortOrder }, { id: "desc" }];
        break;
      case "brand":
        orderBy = [{ brand: { name: sortOrder } }, { id: "desc" }];
        break;
      case "model":
        orderBy = [{ model: { name: sortOrder } }, { id: "desc" }];
        break;
      default:
        // Por defecto usar id (más eficiente que createdAt)
        orderBy = [{ id: sortOrder as "asc" | "desc" }];
    }
  }

  const query: Prisma.MotorcycleFindManyArgs = {
    where: baseWhere,
    select: baseSelect,
    orderBy,
  };

  // Agregar paginación si se especifica
  if (options.pagination) {
    const { page, pageSize } = options.pagination;
    query.skip = (page - 1) * pageSize;
    query.take = pageSize;
  } else if (options.filter?.limit) {
    query.take = options.filter.limit;
  }

  return query;
};

// 🚀 Función con cache para datos frecuentes
const getCachedMotorcycles = unstable_cache(
  async (organizationId: string, options: GetMotorcyclesOptions) => {
    const query = buildMotorcycleQuery(organizationId, options);
    return await prisma.motorcycle.findMany(query);
  },
  ["motorcycles-unified"],
  {
    revalidate: 60, // Cache por 1 minuto
    tags: ["motorcycles"],
  },
);

// 🚀 Función de transformación OPTIMIZADA
const transformMotorcycleData = (moto: any): MotorcycleTableData => ({
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
  // 🚀 OPTIMIZACIÓN: Simplificar datos de marca sin sub-queries complejas
  brand: moto.brand
    ? {
        name: moto.brand.name,
        color: null, // Se puede obtener por separado si es necesario para mejor performance
      }
    : null,
  model: moto.model,
  color: moto.color,
  branch: moto.branch,
  // 🚀 OPTIMIZACIÓN: Solo incluir supplier si está presente (conditional)
  ...(moto.supplier && { supplier: moto.supplier }),
  // 🚀 OPTIMIZACIÓN: Solo primera reserva activa, ya optimizada en query
  reservation: moto.reservations?.[0] || null,
});

// 🚀 Función principal unificada (sin paginación)
export async function getMotorcycles(
  options: GetMotorcyclesOptions = {},
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

    // Obtener datos
    const motorcycles = await prisma.motorcycle.findMany(
      buildMotorcycleQuery(organizationId, defaultOptions),
    );

    // 🚀 Transformación optimizada
    return motorcycles.map(transformMotorcycleData);
  } catch (error) {
    console.error("Error obteniendo motocicletas:", error);
    return [];
  }
}

// 🚀 Función con paginación del lado del servidor OPTIMIZADA
export async function getMotorcyclesPaginated(
  options: GetMotorcyclesOptions = {},
): Promise<MotorcyclesPaginatedResult> {
  try {
    const startTime = performance.now();

    // Configuración por defecto
    const defaultOptions: GetMotorcyclesOptions = {
      filter: {
        ...options.filter,
      },
      optimization: {
        useCache: false, // Cache deshabilitado para paginación para datos siempre frescos
        cacheTime: 60,
        includeSupplier: false,
        includeReservations: true,
        ...options.optimization,
      },
      pagination: {
        page: 1,
        pageSize: 25,
        ...options.pagination,
      },
    };

    // Forzar noStore para datos frescos en paginación
    noStore();

    // Obtener sesión
    const session = await auth.api.getSession({ headers: await headers() });
    const organizationId = session?.user?.organizationId;

    if (!organizationId) {
      console.error("getMotorcyclesPaginated: Usuario no autenticado o sin organización.");
      return {
        data: [],
        total: 0,
        totalPages: 0,
        currentPage: defaultOptions.pagination?.page || 1,
        pageSize: defaultOptions.pagination?.pageSize || 25,
      };
    }

    // 🚀 OPTIMIZACIÓN: Usar transacción para queries paralelas más eficientes
    const result = await prisma.$transaction(async (tx) => {
      const queryConfig = buildMotorcycleQuery(organizationId, defaultOptions);

      // Ejecutar count y findMany en paralelo
      const [totalCount, motorcycles] = await Promise.all([
        tx.motorcycle.count({
          where: queryConfig.where,
        }),
        tx.motorcycle.findMany(queryConfig),
      ]);

      return { totalCount, motorcycles };
    });

    // Calcular total de páginas
    const totalPages = Math.ceil(result.totalCount / (defaultOptions.pagination?.pageSize || 25));

    // 🚀 Transformación optimizada
    const data = result.motorcycles.map(transformMotorcycleData);

    const endTime = performance.now();
    const queryTime = Math.round(endTime - startTime);

    // Log de performance para monitoring
    console.log(
      `[PERF] getMotorcyclesPaginated: ${queryTime}ms | Page: ${defaultOptions.pagination?.page || 1} | Items: ${data.length}/${result.totalCount}`,
    );

    return {
      data,
      total: result.totalCount,
      totalPages,
      currentPage: defaultOptions.pagination?.page || 1,
      pageSize: defaultOptions.pagination?.pageSize || 25,
    };
  } catch (error) {
    console.error("Error obteniendo motocicletas paginadas:", error);
    return {
      data: [],
      total: 0,
      totalPages: 0,
      currentPage: 1,
      pageSize: 25,
    };
  }
}

// 🚀 Funciones de conveniencia actualizadas OPTIMIZADAS
export async function getMotorcyclesOptimized(options?: {
  state?: MotorcycleState[];
  limit?: number;
  pagination?: {
    page: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  };
}): Promise<MotorcyclesPaginatedResult> {
  // 🚀 ULTRA OPTIMIZATION: Usar función ultra-rápida para paginación
  if (options?.pagination) {
    return getMotorcyclesUltraFast(options);
  }

  // Para consultas sin paginación, usar la función normal optimizada
  const result = await getMotorcycles({
    filter: {
      state: options?.state,
      limit: options?.limit || 100,
    },
    optimization: {
      useCache: false,
      includeReservations: false, // Skip reservations for speed
      includeSupplier: false,
    },
  });

  return {
    data: result,
    total: result.length,
    totalPages: 1,
    currentPage: 1,
    pageSize: result.length,
  };
}

export async function getMotorcyclesWithSupplier(filter?: {
  state?: MotorcycleState[];
  limit?: number;
}): Promise<MotorcycleTableData[]> {
  return getMotorcycles({
    filter,
    optimization: {
      useCache: false,
      includeReservations: true,
      includeSupplier: true,
    },
  });
}

export async function getMotorcyclesBasic(filter?: {
  state?: MotorcycleState[];
  limit?: number;
}): Promise<MotorcycleTableData[]> {
  return getMotorcycles({
    filter,
    optimization: {
      useCache: false,
      includeReservations: false,
      includeSupplier: false,
    },
  });
}

// 🚀 Función para invalidar cache MEJORADA
export async function invalidateMotorcyclesCache() {
  try {
    // En Next.js 15, revalidar paths específicos
    const { revalidatePath, revalidateTag } = await import("next/cache");

    // Revalidar rutas relacionadas con motocicletas
    revalidatePath("/sales");
    revalidatePath("/stock");
    revalidatePath("/dashboard");

    // Revalidar tags de cache
    revalidateTag("motorcycles");
    revalidateTag("motorcycles-unified");

    console.log("✅ Cache de motocicletas invalidado correctamente");
    return { success: true };
  } catch (error) {
    console.error("❌ Error invalidando cache de motocicletas:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
  }
}

// 🚀 Nueva función para obtener estadísticas de performance
export async function getMotorcyclesPerformanceStats(organizationId: string) {
  try {
    const startTime = performance.now();

    const stats = await prisma.$queryRaw<Array<{ count: bigint; state: string }>>`
      SELECT state, COUNT(*) as count 
      FROM "Motorcycle" 
      WHERE "organizationId" = ${organizationId}
      GROUP BY state
    `;

    const endTime = performance.now();
    const queryTime = Math.round(endTime - startTime);

    console.log(`[PERF] getMotorcyclesPerformanceStats: ${queryTime}ms`);

    return {
      stats: stats.map((row) => ({
        state: row.state,
        count: Number(row.count),
      })),
      queryTime,
    };
  } catch (error) {
    console.error("Error obteniendo estadísticas de performance:", error);
    return { stats: [], queryTime: 0 };
  }
}

// 🚀 ULTRA OPTIMIZADA: Función de paginación con queries mínimas
export async function getMotorcyclesUltraFast(options?: {
  state?: MotorcycleState[];
  limit?: number;
  pagination?: {
    page: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  };
}): Promise<MotorcyclesPaginatedResult> {
  try {
    const startTime = performance.now();

    // Obtener sesión
    const session = await auth.api.getSession({ headers: await headers() });
    const organizationId = session?.user?.organizationId;

    if (!organizationId) {
      return {
        data: [],
        total: 0,
        totalPages: 0,
        currentPage: 1,
        pageSize: 25,
      };
    }

    const page = options?.pagination?.page || 1;
    const pageSize = options?.pagination?.pageSize || 25;
    const states = options?.state || ["STOCK", "RESERVADO", "PAUSADO"];

    // 🚀 OPTIMIZACIÓN 1: WHERE clause optimizado
    const whereClause = {
      organizationId,
      state: { in: states },
    };

    // 🚀 OPTIMIZACIÓN 2: Count ultra-rápido con Prisma
    const total = await prisma.motorcycle.count({
      where: whereClause,
    });

    // 🚀 OPTIMIZACIÓN 3: Query principal con SELECT mínimo
    const motorcycles = await prisma.motorcycle.findMany({
      where: whereClause,
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
        brand: {
          select: { name: true },
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
      },
      orderBy: [{ state: "asc" }, { id: "desc" }],
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

    // 🚀 OPTIMIZACIÓN 4: Transformación ultra-rápida
    const data: MotorcycleTableData[] = motorcycles.map((m) => ({
      id: m.id,
      year: m.year,
      displacement: m.displacement,
      mileage: m.mileage,
      retailPrice: m.retailPrice,
      wholesalePrice: m.wholesalePrice,
      costPrice: m.costPrice,
      currency: m.currency,
      state: m.state,
      chassisNumber: m.chassisNumber,
      engineNumber: m.engineNumber,
      brand: m.brand ? { name: m.brand.name, color: null } : null,
      model: m.model ? { name: m.model.name } : null,
      color: m.color
        ? {
            name: m.color.name,
            colorOne: m.color.colorOne || "",
            colorTwo: m.color.colorTwo,
          }
        : null,
      branch: m.branch ? { name: m.branch.name } : null,
      reservation: null, // Skip reservations for speed
    }));

    const endTime = performance.now();
    const queryTime = Math.round(endTime - startTime);

    console.log(
      `⚡ [ULTRA-FAST] getMotorcyclesUltraFast: ${queryTime}ms | Page: ${page} | Items: ${data.length}/${total}`,
    );

    return {
      data,
      total,
      totalPages: Math.ceil(total / pageSize),
      currentPage: page,
      pageSize,
    };
  } catch (error) {
    console.error("Error en getMotorcyclesUltraFast:", error);
    return {
      data: [],
      total: 0,
      totalPages: 0,
      currentPage: 1,
      pageSize: 25,
    };
  }
}
