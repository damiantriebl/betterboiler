"use server";

import prisma from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import { getOrganizationIdFromSession } from "../getOrganizationIdFromSession";
import { getBranchesForOrg } from "./get-branch";

// Tipos
import type { BrandForCombobox } from "@/app/(app)/stock/new/page";
import type { ColorConfig, ColorType } from "@/types/ColorType"; // Importar ColorType enum
import type { Brand, Model, MotoColor, Supplier } from "@prisma/client";
import type { BranchData } from "./get-branch";

export async function getFormData() {
  noStore();
  const organizationId = await getOrganizationIdFromSession();

  if (!organizationId) {
    throw new Error("Usuario no autenticado o sin organización.");
  }

  try {
    const [brandsData, colorsData, branchesResult, suppliers] = await Promise.all([
      prisma.brand.findMany({
        where: { organizationBrands: { some: { organizationId } } },
        // Seleccionar solo id y name para modelos
        select: { id: true, name: true, models: { select: { id: true, name: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.motoColor.findMany({
        where: { organizationId },
        // Seleccionar los campos necesarios para ColorConfig
        select: { id: true, name: true, colorOne: true, colorTwo: true, type: true },
        orderBy: { name: "asc" },
      }),
      getBranchesForOrg(),
      prisma.supplier.findMany({
        where: { organizationId },
        orderBy: { legalName: "asc" },
      }),
    ]);

    // Formatear marcas
    // Usar tipo inferido por Prisma para brand en map
    const availableBrands: BrandForCombobox[] = brandsData.map((brand) => ({
      id: brand.id,
      name: brand.name,
      // Usar tipo inferido por Prisma para model en map
      models: brand.models.map((model) => ({ id: model.id, name: model.name })),
      color: null, // BrandForCombobox requiere 'color'
    }));

    // Validar resultado de getBranchesForOrg
    if (branchesResult.error || !branchesResult.data) {
      console.error("Error en getBranchesForOrg:", branchesResult.error);
      throw new Error("No se pudieron cargar las sucursales.");
    }
    const availableBranches: BranchData[] = branchesResult.data;

    // Mapear datos de Prisma a ColorConfig
    const availableColors: ColorConfig[] = colorsData.map((color) => ({
      id: color.id.toString(),
      name: color.name,
      // Convertir string de Prisma a enum ColorType
      type: color.type as ColorType, // Asumir que el string es un valor válido del enum
      colorOne: color.colorOne,
      colorTwo: color.colorTwo ?? undefined,
    }));

    return {
      availableBrands,
      availableColors,
      availableBranches,
      suppliers,
    };
  } catch (error) {
    console.error("Error fetching form data:", error);
    throw new Error("No se pudieron cargar los datos necesarios para el formulario.");
  }
}
