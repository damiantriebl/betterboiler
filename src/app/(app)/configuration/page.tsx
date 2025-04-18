import prisma from "@/lib/prisma";
import { type Model, type OrganizationModelConfig, type OrganizationBrand } from "@prisma/client";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ManageBrands from "./ManageBrands";
import ManageBranches from "./ManageBranches";
import ManageColors from "./ManageColors";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type ColorConfig, ColorType } from "@/types/ColorType";
import { type Sucursal } from "@prisma/client";
import { DisplayModelData, OrganizationBrandDisplayData } from "./Interfaces";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

async function getOrganizationBrandsData(
  organizationId: string,
): Promise<OrganizationBrandDisplayData[]> {
  try {
    const orgBrandAssociations = await prisma.organizationBrand.findMany({
      where: { organizationId: organizationId },
      orderBy: { order: "asc" },
      include: {
        brand: {
          include: {
            models: {
              select: {
                id: true,
                name: true,
                organizationModelConfigs: {
                  where: { organizationId: organizationId },
                  select: { order: true, isVisible: true },
                },
              },
            },
          },
        },
      },
    });

    // Define the expected type for association with includes
    type OrgBrandWithIncludes = Prisma.OrganizationBrandGetPayload<{
      include: {
        brand: {
          include: {
            models: {
              select: {
                id: true;
                name: true;
                organizationModelConfigs: {
                  select: { order: true; isVisible: true };
                  where: { organizationId: string };
                };
              };
            };
          };
        };
      };
    }>;

    // Process the fetched data to filter and format models based on organization config
    const formattedData: OrganizationBrandDisplayData[] = orgBrandAssociations.map(
      (assoc: OrgBrandWithIncludes) => {
        // Filter models: Keep only those configured AND visible for this organization
        const orgVisibleModels = assoc.brand.models
          .filter(
            (m) =>
              m.organizationModelConfigs &&
              m.organizationModelConfigs.length > 0 &&
              m.organizationModelConfigs[0].isVisible,
          )
          .map((m) => ({
            id: m.id,
            name: m.name,
            // Use the order and visibility from the specific OrganizationModelConfig
            orgOrder: m.organizationModelConfigs[0].order,
            isVisible: m.organizationModelConfigs[0].isVisible,
          }))
          // Sort the models based on their organization-specific order
          .sort((a, b) => a.orgOrder - b.orgOrder);

        return {
          id: assoc.id,
          order: assoc.order,
          color: assoc.color,
          brand: {
            id: assoc.brand.id,
            name: assoc.brand.name,
            models: orgVisibleModels,
          },
        };
      },
    );

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
      orderBy: { order: "asc" },
    });

    const formattedColors: ColorConfig[] = colors.map((c) => ({
      id: c.id.toString(),
      dbId: c.id,
      name: c.name,
      type: c.type as ColorType,
      colorOne: c.colorOne,
      colorTwo: c.colorTwo ?? undefined,
      order: c.order,
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
      orderBy: { order: "asc" },
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
    redirect("/sign-in");
  }
  const organizationId = session.user.organizationId;

  if (!organizationId) {
    return (
      <div className="container mx-auto p-4">
        <p className="text-red-600">Error: Usuario no asociado a una organización.</p>
      </div>
    );
  }

  const [initialOrganizationBrands, initialMotoColorsData, initialSucursalesData] =
    await Promise.all([
      getOrganizationBrandsData(organizationId),
      getMotoColors(organizationId),
      getOrganizationSucursales(organizationId),
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
          <ManageColors initialColorsData={initialMotoColorsData} organizationId={organizationId} />
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
