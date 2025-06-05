"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import type { MotorcycleState } from "@prisma/client";
import { headers } from "next/headers";
import type { MotorcycleTableData } from "./get-motorcycles-unified";
import { getMotorcycles } from "./get-motorcycles-unified";

export async function searchMotorcyclesFuzzy(
  searchInput: string,
  opts: {
    filter?: { state?: MotorcycleState[]; limit?: number };
    optimization?: {
      useCache?: boolean;
      cacheTime?: number;
      includeSupplier?: boolean;
      includeReservations?: boolean;
    };
  } = {},
): Promise<MotorcycleTableData[]> {
  console.log("🔍 [FUZZY] =================================");
  console.log(`🔍 [FUZZY] Iniciando búsqueda para: "${searchInput}"`);

  try {
    // Si no hay término de búsqueda, usar función normal
    if (!searchInput || !searchInput.trim()) {
      console.log("🔍 [FUZZY] Búsqueda vacía -> usando getMotorcycles normal");
      const normalResults = await getMotorcycles(opts);
      console.log(`🔍 [FUZZY] getMotorcycles devolvió ${normalResults.length} resultados`);
      return normalResults;
    }

    // Obtener sesión y organizationId
    const session = await auth.api.getSession({ headers: await headers() });
    const orgId = session?.user?.organizationId;

    console.log(`🔍 [FUZZY] OrganizationId: ${orgId}`);

    if (!orgId) {
      console.error("🔍 [FUZZY] ❌ No se pudo obtener organizationId");
      return [];
    }

    const searchTerm = searchInput.trim().toLowerCase();
    console.log(`🔍 [FUZZY] Término procesado: "${searchTerm}"`);

    // PASO 1: Verificar cuántas motocicletas hay en total
    const totalCount = await prisma.motorcycle.count({
      where: { organizationId: orgId },
    });
    console.log(`🔍 [FUZZY] Total motocicletas en BD: ${totalCount}`);

    if (totalCount === 0) {
      console.log("🔍 [FUZZY] ❌ No hay motocicletas en la BD para esta organización");
      return [];
    }

    // *** NUEVO ALGORITMO FUZZY MEJORADO ***

    // PASO 2: Múltiples estrategias de búsqueda fuzzy
    console.log("🔍 [FUZZY] Aplicando múltiples estrategias de búsqueda...");

    // Estrategia 1: Búsqueda simple (contiene el término)
    console.log("🔍 [FUZZY] Estrategia 1: Búsqueda simple...");
    const simpleResults = await findByContains(orgId, searchTerm, opts);
    console.log(`🔍 [FUZZY] Estrategia 1 encontró: ${simpleResults.length} resultados`);

    // Si encontramos resultados con búsqueda simple, devolverlos
    if (simpleResults.length > 0) {
      return transformResults(simpleResults);
    }

    // Estrategia 2: Búsqueda con intercambio de caracteres comunes (v↔b, s↔z, c↔k, etc.)
    console.log("🔍 [FUZZY] Estrategia 2: Intercambio de caracteres...");
    const charSwapResults = await findByCharacterSwap(orgId, searchTerm, opts);
    console.log(`🔍 [FUZZY] Estrategia 2 encontró: ${charSwapResults.length} resultados`);

    if (charSwapResults.length > 0) {
      return transformResults(charSwapResults);
    }

    // Estrategia 3: Búsqueda sin vocales (algoritmo original)
    console.log("🔍 [FUZZY] Estrategia 3: Sin vocales...");
    const noVowelsResults = await findByNoVowels(orgId, searchTerm, opts);
    console.log(`🔍 [FUZZY] Estrategia 3 encontró: ${noVowelsResults.length} resultados`);

    if (noVowelsResults.length > 0) {
      return transformResults(noVowelsResults);
    }

    // Estrategia 4: Búsqueda por consonantes principales
    console.log("🔍 [FUZZY] Estrategia 4: Consonantes principales...");
    const consonantsResults = await findByMainConsonants(orgId, searchTerm, opts);
    console.log(`🔍 [FUZZY] Estrategia 4 encontró: ${consonantsResults.length} resultados`);

    if (consonantsResults.length > 0) {
      return transformResults(consonantsResults);
    }

    console.log("🔍 [FUZZY] ❌ No se encontraron resultados con ninguna estrategia");
    console.log("🔍 [FUZZY] =================================");
    return [];
  } catch (error) {
    console.error("🔍 [FUZZY] ❌ Error en fuzzy search:", error);
    console.log("🔄 [FUZZY] Fallback a búsqueda normal...");
    const fallbackResults = await getMotorcycles({
      ...opts,
      filter: { ...opts.filter, search: searchInput },
    });
    console.log(`🔍 [FUZZY] Fallback devolvió ${fallbackResults.length} resultados`);
    console.log("🔍 [FUZZY] =================================");
    return fallbackResults;
  }
}

// 🔍 ESTRATEGIA 1: Búsqueda simple (contiene)
async function findByContains(orgId: string, searchTerm: string, opts: any) {
  return await prisma.motorcycle.findMany({
    where: {
      organizationId: orgId,
      ...(opts.filter?.state && { state: { in: opts.filter.state } }),
      OR: [
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
      ],
    },
    include: {
      brand: { select: { name: true } },
      model: { select: { name: true } },
      color: { select: { name: true, colorOne: true, colorTwo: true } },
      branch: { select: { name: true } },
    },
    take: opts.filter?.limit || 50,
    orderBy: [{ state: "asc" }, { id: "desc" }],
  });
}

// 🔍 ESTRATEGIA 2: Intercambio de caracteres comunes (v↔b, s↔z, c↔k, etc.)
async function findByCharacterSwap(orgId: string, searchTerm: string, opts: any) {
  const swapMap: Record<string, string[]> = {
    v: ["b"],
    b: ["v", "p"],
    s: ["z", "c"],
    z: ["s"],
    c: ["k", "s", "z"],
    k: ["c", "q"],
    q: ["k", "c"],
    i: ["y"],
    y: ["i"],
    j: ["g", "y"],
    g: ["j"],
    ll: ["y"],
    rr: ["r"],
    r: ["rr"],
  };

  // Generar variaciones del término con intercambios
  const variations = generateSwapVariations(searchTerm, swapMap);
  console.log("🔍 [FUZZY] Variaciones generadas:", variations);

  for (const variation of variations) {
    const results = await findByContains(orgId, variation, opts);
    if (results.length > 0) {
      console.log(`🔍 [FUZZY] ✅ Encontrado con variación: "${variation}"`);
      return results;
    }
  }

  return [];
}

// 🔍 ESTRATEGIA 3: Sin vocales (algoritmo original)
async function findByNoVowels(orgId: string, searchTerm: string, opts: any) {
  const fuzzyTerm = searchTerm.replace(/[aeiou]/gi, "");
  console.log(`🔍 [FUZZY] Término sin vocales: "${fuzzyTerm}"`);

  if (fuzzyTerm.length < 2) {
    return [];
  }

  return await prisma.motorcycle.findMany({
    where: {
      organizationId: orgId,
      ...(opts.filter?.state && { state: { in: opts.filter.state } }),
      OR: [
        {
          brand: {
            name: {
              contains: fuzzyTerm,
              mode: "insensitive" as const,
            },
          },
        },
        {
          model: {
            name: {
              contains: fuzzyTerm,
              mode: "insensitive" as const,
            },
          },
        },
      ],
    },
    include: {
      brand: { select: { name: true } },
      model: { select: { name: true } },
      color: { select: { name: true, colorOne: true, colorTwo: true } },
      branch: { select: { name: true } },
    },
    take: opts.filter?.limit || 50,
    orderBy: [{ state: "asc" }, { id: "desc" }],
  });
}

// 🔍 ESTRATEGIA 4: Consonantes principales (solo las más distintivas)
async function findByMainConsonants(orgId: string, searchTerm: string, opts: any) {
  // Extraer solo consonantes principales (eliminando consonantes repetidas y menos distintivas)
  const mainConsonants = searchTerm
    .toLowerCase()
    .replace(/[aeiou\s]/gi, "")
    .replace(/(.)\1+/g, "$1") // Eliminar consonantes repetidas
    .slice(0, 4); // Solo las primeras 4 consonantes

  console.log(`🔍 [FUZZY] Consonantes principales: "${mainConsonants}"`);

  if (mainConsonants.length < 2) {
    return [];
  }

  // Buscar que contenga esas consonantes en orden (pero no necesariamente consecutivas)
  const consonantPattern = mainConsonants.split("").join(".*");
  console.log(`🔍 [FUZZY] Patrón de consonantes: "${consonantPattern}"`);

  // Para PostgreSQL, usamos una aproximación con LIKE en lugar de REGEXP
  // Buscamos cada consonante por separado
  const consonantQueries = mainConsonants.split("").map((consonant) => ({
    brand: {
      name: {
        contains: consonant,
        mode: "insensitive" as const,
      },
    },
  }));

  return await prisma.motorcycle.findMany({
    where: {
      organizationId: orgId,
      ...(opts.filter?.state && { state: { in: opts.filter.state } }),
      OR: consonantQueries,
    },
    include: {
      brand: { select: { name: true } },
      model: { select: { name: true } },
      color: { select: { name: true, colorOne: true, colorTwo: true } },
      branch: { select: { name: true } },
    },
    take: opts.filter?.limit || 50,
    orderBy: [{ state: "asc" }, { id: "desc" }],
  });
}

// 🛠️ UTILIDAD: Generar variaciones con intercambio de caracteres
function generateSwapVariations(term: string, swapMap: Record<string, string[]>): string[] {
  const variations = new Set<string>();

  // Agregar el término original
  variations.add(term);

  // Para cada posición en el término
  for (let i = 0; i < term.length; i++) {
    const char = term[i];
    const swaps = swapMap[char];

    if (swaps) {
      for (const swapChar of swaps) {
        const newTerm = term.substring(0, i) + swapChar + term.substring(i + 1);
        variations.add(newTerm);
      }
    }
  }

  // También probar intercambios de caracteres dobles como 'll'
  if (term.includes("ll")) {
    variations.add(term.replace(/ll/g, "y"));
  }
  if (term.includes("rr")) {
    variations.add(term.replace(/rr/g, "r"));
  }

  return Array.from(variations).filter((v) => v !== term); // Excluir el original
}

// 🛠️ UTILIDAD: Transformar resultados al formato esperado
function transformResults(results: any[]): MotorcycleTableData[] {
  return results.map(
    (item): MotorcycleTableData => ({
      id: item.id,
      year: item.year,
      displacement: item.displacement,
      mileage: item.mileage,
      retailPrice: item.retailPrice,
      wholesalePrice: item.wholesalePrice,
      costPrice: item.costPrice,
      currency: item.currency,
      state: item.state,
      chassisNumber: item.chassisNumber,
      engineNumber: item.engineNumber,
      brand: item.brand ? { name: item.brand.name, color: null } : null,
      model: item.model ? { name: item.model.name } : null,
      color: item.color
        ? {
            name: item.color.name,
            colorOne: item.color.colorOne || "",
            colorTwo: item.color.colorTwo,
          }
        : null,
      branch: item.branch ? { name: item.branch.name } : null,
      reservation: null,
    }),
  );
}

export async function getMotorcycleSuggestions(
  searchInput: string,
  limitSuggestions = 10,
): Promise<{ brands: string[]; models: string[]; suggestions: string[] }> {
  try {
    if (!searchInput || !searchInput.trim()) {
      return { brands: [], models: [], suggestions: [] };
    }

    const session = await auth.api.getSession({ headers: await headers() });
    const userOrgId = session?.user?.organizationId;

    if (!userOrgId) {
      return { brands: [], models: [], suggestions: [] };
    }

    const searchTerm = searchInput.trim();

    // Obtener marcas únicas que coincidan
    const brandSuggestions = await prisma.brand.findMany({
      where: {
        motorcycles: {
          some: { organizationId: userOrgId },
        },
        name: { contains: searchTerm, mode: "insensitive" },
      },
      select: { name: true },
      distinct: ["name"],
      take: limitSuggestions,
    });

    // Obtener modelos únicos que coincidan
    const modelSuggestions = await prisma.model.findMany({
      where: {
        motorcycles: {
          some: { organizationId: userOrgId },
        },
        name: { contains: searchTerm, mode: "insensitive" },
      },
      select: { name: true },
      distinct: ["name"],
      take: limitSuggestions,
    });

    const brands = brandSuggestions.map((b) => b.name);
    const models = modelSuggestions.map((m) => m.name);
    const allSuggestions = [...brands, ...models].slice(0, limitSuggestions);

    return { brands, models, suggestions: allSuggestions };
  } catch (error) {
    console.error("Error obteniendo sugerencias:", error);
    return { brands: [], models: [], suggestions: [] };
  }
}

// 🚨 FUNCIÓN DE DEBUG: Para verificar datos en la BD (remover en producción)
export async function debugMotorcycleData() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const orgId = session?.user?.organizationId;

    if (!orgId) {
      console.log("🚨 [DEBUG] No se pudo obtener organizationId");
      return { error: "No organization ID" };
    }

    console.log(`🚨 [DEBUG] Organizacion ID: ${orgId}`);

    // Contar total de motocicletas
    const totalMotos = await prisma.motorcycle.count({
      where: { organizationId: orgId },
    });

    // Listar algunas marcas disponibles
    const availableBrands = await prisma.brand.findMany({
      where: {
        motorcycles: {
          some: { organizationId: orgId },
        },
      },
      select: { name: true },
      take: 20,
    });

    // Buscar específicamente "benelli"
    const benelliResults = await prisma.motorcycle.findMany({
      where: {
        organizationId: orgId,
        brand: {
          name: { contains: "benelli", mode: "insensitive" },
        },
      },
      include: {
        brand: { select: { name: true } },
        model: { select: { name: true } },
      },
      take: 5,
    });

    // Buscar "bnll" (benelli sin vocales)
    const fuzzyBenelliResults = await prisma.motorcycle.findMany({
      where: {
        organizationId: orgId,
        brand: {
          name: { contains: "bnll", mode: "insensitive" },
        },
      },
      include: {
        brand: { select: { name: true } },
        model: { select: { name: true } },
      },
      take: 5,
    });

    const debugInfo = {
      organizationId: orgId,
      totalMotos,
      availableBrands: availableBrands.map((b) => b.name),
      benelliDirectResults: benelliResults.length,
      benelliSamples: benelliResults.map((r) => ({ brand: r.brand?.name, model: r.model?.name })),
      fuzzyBenelliResults: fuzzyBenelliResults.length,
      fuzzyBenelliSamples: fuzzyBenelliResults.map((r) => ({
        brand: r.brand?.name,
        model: r.model?.name,
      })),
    };

    console.log("🚨 [DEBUG] Información de la BD:", JSON.stringify(debugInfo, null, 2));
    return debugInfo;
  } catch (error) {
    console.error("🚨 [DEBUG] Error:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}
