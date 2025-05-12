import prisma from "@/lib/prisma";
import type { Model, OrganizationModelConfig, OrganizationBrand } from "@prisma/client";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ManageBrands from "./ManageBrands";
import ManageBranches from "./ManageBranches";
import ManageColors from "./ManageColors";
import ManagePaymentMethods from "./ManagePaymentMethods";
import ManageBankingPromotions from "./ManageBankingPromotions";
import ManageBankCards from "./ManageBankCards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClientManageBrands from "./ClientManageBrands";
import type { ColorConfig, ColorType } from "@/types/ColorType";
import type { Sucursal } from "@prisma/client";
import { DisplayModelData, type OrganizationBrandDisplayData } from "./Interfaces";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { getAvailablePaymentMethods, getOrganizationPaymentMethods } from "@/actions/payment-methods/get-payment-methods";
import { type OrganizationPaymentMethodDisplay, type PaymentMethod } from "@/types/payment-methods";
import { type BankingPromotionDisplay, type Bank } from "@/types/banking-promotions";
import { getAllBanks, getOrganizationBankingPromotions } from "@/actions/banking-promotions/get-banking-promotions";
import { getOrganizationIdFromSession } from "@/actions/getOrganizationIdFromSession";
import { getAllCardTypes, getBanksWithCards } from "@/actions/bank-cards/get-bank-cards";

// We'll use these default payment methods if the schema doesn't exist yet
const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 1,
    name: "Efectivo",
    type: "cash",
    description: "Pago en efectivo",
    iconUrl: "/icons/payment-methods/cash.svg"
  },
  {
    id: 2,
    name: "Tarjeta de Crédito",
    type: "credit",
    description: "Pago con tarjeta de crédito",
    iconUrl: "/icons/payment-methods/credit-card.svg"
  },
  {
    id: 3,
    name: "Tarjeta de Débito",
    type: "debit",
    description: "Pago con tarjeta de débito",
    iconUrl: "/icons/payment-methods/debit-card.svg"
  },
  {
    id: 4,
    name: "Transferencia Bancaria",
    type: "transfer",
    description: "Pago por transferencia bancaria",
    iconUrl: "/icons/payment-methods/bank-transfer.svg"
  },
  {
    id: 5,
    name: "Cheque",
    type: "check",
    description: "Pago con cheque",
    iconUrl: "/icons/payment-methods/check.svg"
  },
  {
    id: 6,
    name: "Depósito Bancario",
    type: "deposit",
    description: "Pago por depósito bancario",
    iconUrl: "/icons/payment-methods/bank-deposit.svg"
  },
  {
    id: 7,
    name: "MercadoPago",
    type: "mercadopago",
    description: "Pago a través de MercadoPago",
    iconUrl: "/icons/payment-methods/mercadopago.svg"
  },
  {
    id: 8,
    name: "Código QR",
    type: "qr",
    description: "Pago mediante escaneo de código QR",
    iconUrl: "/icons/payment-methods/qr-code.svg"
  }
];

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
      orderBy: [
        { isGlobal: 'asc' }, // Primero los no globales, luego los globales
        { order: 'asc' }     // Luego por orden
      ],
    });

    const formattedColors: ColorConfig[] = colors.map((c) => ({
      id: c.id.toString(),
      dbId: c.id,
      name: c.name,
      type: c.type as ColorType,
      colorOne: c.colorOne,
      colorTwo: c.colorTwo ?? undefined,
      order: c.order,
      isGlobal: c.isGlobal
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

// Function to get payment methods with fallback to defaults if error occurs
async function getPaymentMethodsData(organizationId: string) {
  try {
    // Try to get from database
    const organizationMethods = await getOrganizationPaymentMethods(organizationId);
    const availableMethods = await getAvailablePaymentMethods(organizationId);

    return { organizationMethods, availableMethods };
  } catch (error) {
    console.error("Error fetching payment methods, using defaults:", error);
    return {
      organizationMethods: [] as OrganizationPaymentMethodDisplay[],
      availableMethods: DEFAULT_PAYMENT_METHODS
    };
  }
}

// Function to get banking promotions data with error handling
async function getBankingPromotionsData(organizationId: string) {
  try {
    // Get banking promotions and banks data
    const promotions = await getOrganizationBankingPromotions(organizationId);
    const banks = await getAllBanks();

    return { promotions, banks };
  } catch (error) {
    console.error("Error fetching banking promotions:", error);
    return {
      promotions: [] as BankingPromotionDisplay[],
      banks: [] as Bank[]
    };
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

  const [
    initialOrganizationBrands,
    initialMotoColorsData,
    initialSucursalesData,
    { organizationMethods, availableMethods },
    { promotions, banks }
  ] = await Promise.all([
    getOrganizationBrandsData(organizationId),
    getMotoColors(organizationId),
    getOrganizationSucursales(organizationId),
    getPaymentMethodsData(organizationId),
    getBankingPromotionsData(organizationId)
  ]);

  // Fetch card types
  const cardTypes = await getAllCardTypes();

  // Fetch banks with cards
  const banksWithCards = await getBanksWithCards(organizationId);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Configuración General</h1>

      <Tabs defaultValue="marcas" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-4">
          <TabsTrigger value="marcas">Marcas</TabsTrigger>
          <TabsTrigger value="colores">Colores</TabsTrigger>
          <TabsTrigger value="sucursales">Sucursales</TabsTrigger>
          <TabsTrigger value="metodos-pago">Métodos de Pago</TabsTrigger>
          <TabsTrigger value="bancos-tarjetas">Bancos y Tarjetas</TabsTrigger>
          <TabsTrigger value="promociones">Promociones</TabsTrigger>
        </TabsList>

        <TabsContent value="marcas">
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <ClientManageBrands
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

        <TabsContent value="metodos-pago">
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <ManagePaymentMethods
              initialOrganizationMethods={organizationMethods}
              availableMethods={availableMethods}
              organizationId={organizationId}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="bancos-tarjetas">
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <ManageBankCards
              initialBanksWithCards={banksWithCards}
              availableCardTypes={cardTypes}
              availableBanks={banks}
              organizationId={organizationId}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="promociones">
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <ManageBankingPromotions
              promotions={promotions}
              paymentMethods={organizationMethods.map(om => om.card)
                .filter((method): method is PaymentMethod => method !== undefined)
              }
              bankCards={banksWithCards.flatMap(b =>
                b.cards.map(card => ({
                  id: card.id,
                  bank: b.bank,
                  cardType: card.cardType,
                  bankId: b.bank.id,
                  cardTypeId: card.cardType.id,
                  organizationId,
                  isEnabled: card.isEnabled,
                  order: card.order,
                  displayName: `${card.cardType.name} - ${b.bank.name}`
                }))
              )}
              organizationId={organizationId}
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
