import prisma from '@/lib/prisma';
import { type Model, type OrganizationModelConfig, type OrganizationBrand } from '@prisma/client';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import ManageBrands from './ManageBrands';
import ManageBranches from './ManageBranches';
import ManageColors from './ManageColors';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type ColorConfig } from '@/types/ColorType';
import { type Sucursal } from '@prisma/client';
import { DisplayModelData, OrganizationBrandDisplayData } from './Interfaces';
import { auth } from "@/auth";
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

async function getOrganizationBrandsData(organizationId: string): Promise<OrganizationBrandDisplayData[]> {
  try {
    const orgBrandAssociations = await prisma.organizationBrand.findMany({
      where: { organizationId: organizationId },
      orderBy: { order: 'asc' },
      include: {
        brand: {
          include: {
            models: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    const formattedData: OrganizationBrandDisplayData[] = orgBrandAssociations.map(assoc => ({
      id: assoc.id,
      order: assoc.order,
      color: assoc.color,
      brand: {
        id: assoc.brand.id,
        name: assoc.brand.name,
        models: assoc.brand.models.map(m => ({ id: m.id, name: m.name, orgOrder: 0 }))
      }
    }));

    return formattedData;

  } catch (error) {
    console.error("🚨 ERROR fetching Organization Brands N:M:", error);
    return [];
  }
}

async function getMotoColors(organizationId: string): Promise<ColorConfig[]> {
  try {
    const colors = await prisma.motoColor.findMany({
      where: { organizationId: organizationId },
      orderBy: { order: 'asc' },
    });

    const formattedColors: ColorConfig[] = colors.map(c => ({
      id: c.id.toString(),
      dbId: c.id,
      nombre: c.nombre,
      tipo: c.tipo as ColorConfig['tipo'],
      color1: c.color1,
      color2: c.color2 ?? undefined,
      order: c.order
    }));
    return formattedColors;
  } catch (error) {
    console.error("🚨 ERROR fetching Moto Colors:", error);
    return [];
  }
}

async function getOrganizationSucursales(organizationId: string): Promise<Sucursal[]> {
  try {
    const sucursales = await prisma.sucursal.findMany({
      where: { organizationId: organizationId },
      orderBy: { order: 'asc' },
    });
    return sucursales;
  } catch (error) {
    console.error("🚨 ERROR fetching Sucursales:", error);
    return [];
  }
}

export default async function ConfigurationPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    redirect('/sign-in');
  }
  const organizationId = session.user.organizationId;

  if (!organizationId) {
    return <div className="container mx-auto p-4"><p className='text-red-600'>Error: Usuario no asociado a una organización.</p></div>;
  }

  const [initialOrganizationBrands, initialMotoColorsData, initialSucursalesData] = await Promise.all([
    getOrganizationBrandsData(organizationId),
    getMotoColors(organizationId),
    getOrganizationSucursales(organizationId)
  ]);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Configuración General</h1>

      <Tabs defaultValue="marcas" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="marcas">Marcas</TabsTrigger>
          <TabsTrigger value="colores">Colores</TabsTrigger>
          <TabsTrigger value="sucursales">Sucursales</TabsTrigger>
        </TabsList>

        <TabsContent value="marcas">
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <ManageBrands
              initialOrganizationBrands={initialOrganizationBrands}
              organizationId={organizationId}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="colores">
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <ManageColors
              initialColorsData={initialMotoColorsData}
              organizationId={organizationId}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="sucursales">
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <ManageBranches initialSucursalesData={initialSucursalesData} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
} 