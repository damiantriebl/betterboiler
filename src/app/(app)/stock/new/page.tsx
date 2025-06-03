import { type BranchData, getBranches } from "@/actions/stock/form-data-unified";
import { getSuppliers } from "@/actions/suppliers/suppliers-unified";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import type { ColorConfig, ColorType } from "@/types/ColorType";
import type { Supplier } from "@prisma/client";
import { headers } from "next/headers";
import { NewStockClientContainer } from "./NewStockClientContainer";
import type { BrandForCombobox } from "./types";

async function getAvailableBrandsAndModels(organizationId: string): Promise<BrandForCombobox[]> {
  console.warn("Verificando getAvailableBrandsAndModels para Org:", organizationId);
  try {
    // Consulta mejorada: Obtener marcas asociadas y solo sus modelos configurados
    const orgBrands = await prisma.organizationBrand.findMany({
      where: { organizationId: organizationId },
      orderBy: { order: "asc" },
      include: {
        brand: {
          // Incluir la marca relacionada
          include: {
            models: {
              // Solo incluir modelos que están configurados para esta organización
              where: {
                organizationModelConfigs: {
                  some: {
                    organizationId: organizationId,
                    isVisible: true,
                  },
                },
              },
              orderBy: { name: "asc" },
              include: {
                organizationModelConfigs: {
                  where: {
                    organizationId: organizationId,
                    isVisible: true,
                  },
                  select: { order: true },
                },
              },
            },
          },
        },
      },
    });

    // Transformación a BrandForCombobox (solo modelos configurados)
    const transformedBrands: BrandForCombobox[] = orgBrands.map((orgBrand) => ({
      id: orgBrand.brand.id,
      name: orgBrand.brand.name,
      color: orgBrand.color,
      models: orgBrand.brand.models
        .sort((a, b) => {
          // Ordenar por el order de OrganizationModelConfig
          const orderA = a.organizationModelConfigs[0]?.order ?? 999;
          const orderB = b.organizationModelConfigs[0]?.order ?? 999;
          return orderA - orderB;
        })
        .map((model) => ({
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
    <div className="container max-w-none px-4 py-8">
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
