import { getBranches, type BranchData } from "@/actions/stock/form-data-unified";
import { getSuppliers } from "@/actions/suppliers/suppliers-unified";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import type { ColorConfig, ColorType } from "@/types/ColorType";
import type { Supplier } from "@prisma/client";
import { headers } from "next/headers";
import * as React from "react";
import { NewStockClientContainer } from "./NewStockClientContainer";

// Definir tipos localmente (copiado de NuevaMotoForm)
export interface ModelInfo {
  id: number;
  name: string;
}
export interface BrandForCombobox {
  id: number;
  name: string;
  color: string | null;
  models: ModelInfo[];
}
// ---

async function getAvailableBrandsAndModels(organizationId: string): Promise<BrandForCombobox[]> {
  console.warn("Verificando getAvailableBrandsAndModels para Org:", organizationId);
  try {
    // Consulta simplificada: Obtener marcas asociadas y todos sus modelos globales
    const orgBrands = await prisma.organizationBrand.findMany({
      where: { organizationId: organizationId },
      orderBy: { order: "asc" },
      include: {
        brand: {
          // Incluir la marca relacionada
          include: {
            models: {
              // Incluir todos los modelos de esa marca
              orderBy: { name: "asc" },
            },
          },
        },
      },
    });

    // Transformación a BrandForCombobox (ahora brand está incluido)
    const transformedBrands: BrandForCombobox[] = orgBrands.map((orgBrand) => ({
      id: orgBrand.brand.id,
      name: orgBrand.brand.name,
      color: orgBrand.color,
      models: orgBrand.brand.models.map((model) => ({
        id: model.id,
        name: model.name,
      })),
    }));
    return transformedBrands;
  } catch (error) {
    console.error("Error fetching brands/models:", error);
    return [];
  }
}

async function getAvailableColors(organizationId: string): Promise<ColorConfig[]> {
  console.warn("Verificando getAvailableColors para Org:", organizationId);
  try {
    const colorsFromDb = await prisma.motoColor.findMany({
      where: { organizationId: organizationId },
      orderBy: { order: "asc" },
    });
    // Transformación a ColorConfig usando nombres en INGLÉS
    const transformedColors: ColorConfig[] = colorsFromDb.map((c) => ({
      id: c.id.toString(),
      dbId: c.id,
      name: c.name,
      type: c.type as ColorType,
      colorOne: c.colorOne,
      colorTwo: c.colorTwo ?? undefined,
      order: c.order,
    }));
    return transformedColors;
  } catch (error) {
    console.error("Error fetching colors:", error);
    return [];
  }
}

export default async function NuevaMotoPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.user.organizationId;
  let availableBrands: BrandForCombobox[] = [];
  let availableColors: ColorConfig[] = [];
  let sucursales: BranchData[] = [];
  let availableSuppliers: Supplier[] = [];

  if (organizationId) {
    const [brandsResult, colorsResult, sucursalesResult, suppliersResult] = await Promise.all([
      getAvailableBrandsAndModels(organizationId),
      getAvailableColors(organizationId),
      getBranches(),
      getSuppliers(),
    ]);

    availableBrands = brandsResult;
    availableColors = colorsResult;
    sucursales = sucursalesResult;
    availableSuppliers = suppliersResult.suppliers;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Ingresar Nueva Moto</h1>

      <div className="mb-12">
        <NewStockClientContainer
          availableBrands={availableBrands}
          availableColors={availableColors}
          availableBranches={sucursales}
          suppliers={availableSuppliers}
        />
      </div>
    </div>
  );
}
