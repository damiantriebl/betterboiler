"use server";

import prisma from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import { getOrganizationIdFromSession } from "../get-Organization-Id-From-Session";
import { getBranches } from "./get-branch";
import { auth } from "@/auth";
import { headers } from "next/headers";

// Tipos
import type { BrandForCombobox } from "@/app/(app)/stock/new/page";
import type { ColorConfig, ColorType } from "@/types/ColorType"; // Importar ColorType enum
import type { Brand, Model, MotoColor, Supplier } from "@prisma/client";
import type { BranchData } from "./get-branch";

export async function getFormData() {
  noStore();
  const org = await getOrganizationIdFromSession();

  if (!org.organizationId) {
    throw new Error("Usuario no autenticado o sin organización.");
  }

  const organizationId = org.organizationId;

  try {
    const [brandsData, colorsData, branchesResult, suppliers] = await Promise.all([
      prisma.organizationBrand.findMany({
        where: { organizationId },
        include: {
          brand: {
            select: { 
              id: true, 
              name: true, 
              models: { select: { id: true, name: true } } 
            }
          }
        },
        orderBy: { order: "asc" },
      }),
      prisma.motoColor.findMany({
        where: { organizationId },
        // Seleccionar los campos necesarios para ColorConfig
        select: { id: true, name: true, colorOne: true, colorTwo: true, type: true },
        orderBy: { name: "asc" },
      }),
      getBranches(),
      prisma.supplier.findMany({
        where: { organizationId },
        orderBy: { legalName: "asc" },
      }),
    ]);

    // Formatear marcas usando la nueva estructura
    const availableBrands: BrandForCombobox[] = brandsData.map((orgBrand) => ({
      id: orgBrand.brand.id,
      name: orgBrand.brand.name,
      models: orgBrand.brand.models.map((model) => ({ id: model.id, name: model.name })),
      color: orgBrand.color, // Color personalizado de la organización
    }));

    // branchesResult ahora es directamente un array
    const availableBranches: BranchData[] = branchesResult;

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
