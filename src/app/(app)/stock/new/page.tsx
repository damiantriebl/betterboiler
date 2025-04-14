import * as React from "react";
import NewStockClientContainer from "./NewStockClientContainer";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { type ColorConfig, type ColorType } from "@/types/ColorType";
import { getBranchesForOrg, type BranchData } from '@/actions/stock/get-sucursales';
import { getSuppliers } from '@/actions/suppliers/manage-suppliers';
import { type Supplier } from '@prisma/client';

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
            orderBy: { order: 'asc' },
            include: {
                brand: { // Incluir la marca relacionada
                    include: {
                        models: { // Incluir todos los modelos de esa marca
                            orderBy: { name: 'asc' }
                        }
                    }
                }
            }
        });
        console.log("[getAvailableBrandsAndModels] Datos crudos de DB:", JSON.stringify(orgBrands, null, 2));

        // Transformación a BrandForCombobox (ahora brand está incluido)
        const transformedBrands: BrandForCombobox[] = orgBrands.map(orgBrand => ({
            id: orgBrand.brand.id,
            name: orgBrand.brand.name,
            color: orgBrand.color,
            models: orgBrand.brand.models.map(model => ({
                id: model.id,
                name: model.name
            }))
        }));
        console.log("[getAvailableBrandsAndModels] Datos transformados:", JSON.stringify(transformedBrands, null, 2));
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
            orderBy: { order: 'asc' }
        });
        console.log("[getAvailableColors] Datos crudos de DB:", JSON.stringify(colorsFromDb, null, 2));

        // Transformación a ColorConfig con aserción de tipo
        const transformedColors: ColorConfig[] = colorsFromDb.map(c => ({
            id: c.id.toString(),
            dbId: c.id,
            nombre: c.nombre,
            tipo: c.tipo as ColorType, // Aserción de tipo
            color1: c.color1,
            color2: c.color2 ?? undefined, // Usar undefined si es null
            order: c.order
        }));
        console.log("[getAvailableColors] Datos transformados:", JSON.stringify(transformedColors, null, 2));
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
        const [
            brandsResult,
            colorsResult,
            sucursalesResult,
            suppliersResult
        ] = await Promise.all([
            getAvailableBrandsAndModels(organizationId),
            getAvailableColors(organizationId),
            getBranchesForOrg(),
            getSuppliers()
        ]);

        availableBrands = brandsResult;
        availableColors = colorsResult;
        sucursales = sucursalesResult.data ?? [];
        availableSuppliers = suppliersResult;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Ingresar Nueva Moto</h1>

            {/* Renderizar el Client Container pasándole los datos iniciales */}
            <div className="mb-12"> {/* Añadir margen inferior */}
                <NewStockClientContainer
                    availableBrands={availableBrands}
                    availableColors={availableColors}
                    sucursales={sucursales}
                    availableSuppliers={availableSuppliers}
                // initialData={{}} // Podemos pasar datos iniciales si es necesario
                />
            </div>
        </div>
    );
}

