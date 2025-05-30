import { getAllCardTypes, getBanksWithCards } from "@/actions/bank-cards/get-bank-cards";
import {
  getAllBanks,
  getOrganizationBankingPromotions,
} from "@/actions/banking-promotions/get-banking-promotions";
import {
  getAvailablePaymentMethods,
  getOrganizationPaymentMethods,
} from "@/actions/payment-methods/get-payment-methods";
import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import prisma from "@/lib/prisma";
import type { ColorConfig, ColorType } from "@/types/ColorType";
import type {
  CardType as BankCardCardType,
  BankCardDisplay,
  BankWithCards,
} from "@/types/bank-cards";
import type { Bank, BankingPromotionDisplay } from "@/types/banking-promotions";
import type { Bank as BankType } from "@/types/banking-promotions"; // Asumiendo que BankType es compatible con la estructura de bank en BankWithCards
import type { OrganizationPaymentMethodDisplay, PaymentMethod } from "@/types/payment-methods";
import type { Branch, Model, OrganizationBrand, OrganizationModelConfig } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ClientManageBrands from "./ClientManageBrands";
import { DisplayModelData, type OrganizationBrandDisplayData } from "./Interfaces";
import ManageBankCards from "./ManageBankCards";
import ManageBankingPromotions from "./ManageBankingPromotions";
import ManageBranches from "./ManageBranches";
import ManageColors from "./ManageColors";
import ManagePaymentMethods from "./ManagePaymentMethods";
import SecuritySettings from "./SecuritySettings";

// We'll use these default payment methods if the schema doesn't exist yet
const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 1,
    name: "Efectivo",
    type: "cash",
    description: "Pago en efectivo",
    iconUrl: "/icons/payment-methods/cash.svg",
  },
  {
    id: 2,
    name: "Tarjeta de Crédito",
    type: "credit",
    description: "Pago con tarjeta de crédito",
    iconUrl: "/icons/payment-methods/credit-card.svg",
  },
  {
    id: 3,
    name: "Tarjeta de Débito",
    type: "debit",
    description: "Pago con tarjeta de débito",
    iconUrl: "/icons/payment-methods/debit-card.svg",
  },
  {
    id: 4,
    name: "Transferencia Bancaria",
    type: "transfer",
    description: "Pago por transferencia bancaria",
    iconUrl: "/icons/payment-methods/bank-transfer.svg",
  },
  {
    id: 5,
    name: "Cheque",
    type: "check",
    description: "Pago con cheque",
    iconUrl: "/icons/payment-methods/check.svg",
  },
  {
    id: 6,
    name: "Depósito Bancario",
    type: "deposit",
    description: "Pago por depósito bancario",
    iconUrl: "/icons/payment-methods/bank-deposit.svg",
  },
  {
    id: 7,
    name: "Código QR",
    type: "qr",
    description: "Pago mediante escaneo de código QR",
    iconUrl: "/icons/payment-methods/qr-code.svg",
  },
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
              orderBy: { name: "asc" },
              select: {
                id: true,
                name: true,
                imageUrl: true,
                specSheetUrl: true,
                files: {
                  select: {
                    id: true,
                    type: true,
                    url: true,
                    name: true,
                  },
                },
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

    type OrgBrandWithIncludes = Prisma.OrganizationBrandGetPayload<{
      include: {
        brand: {
          include: {
            models: {
              select: {
                id: true;
                name: true;
                imageUrl: true;
                specSheetUrl: true;
                files: {
                  select: {
                    id: true;
                    type: true;
                    url: true;
                    name: true;
                  };
                };
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
          .map((m) => {
            const modelData = {
              id: m.id,
              name: m.name,
              imageUrl: m.imageUrl,
              specSheetUrl: m.specSheetUrl,
              files: m.files,
              orgOrder: m.organizationModelConfigs[0].order,
              isVisible: m.organizationModelConfigs[0].isVisible,
            };
            return modelData;
          })
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
        { isGlobal: "asc" }, // Primero los no globales, luego los globales
        { order: "asc" }, // Luego por orden
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
      isGlobal: c.isGlobal,
    }));
    return formattedColors;
  } catch (error) {
    console.error("🚨 ERROR fetching Moto Colors:", error);
    return [];
  }
}

async function getOrganizationBranches(organizationId: string): Promise<Branch[]> {
  try {
    const branches = await prisma.branch.findMany({
      where: { organizationId: organizationId },
      orderBy: { order: "asc" },
    });
    return branches;
  } catch (error) {
    console.error("🚨 ERROR fetching Branches:", error);
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
      availableMethods: DEFAULT_PAYMENT_METHODS,
    };
  }
}

// Function to get banking promotions data with error handling
async function getBankingPromotionsData(organizationId: string) {
  try {
    // Get banking promotions and banks data
    const promotionsRaw = await getOrganizationBankingPromotions(organizationId);
    const banks = await getAllBanks();

    // Transform to BankingPromotionDisplay format by mapping card to bankCard
    const promotions: BankingPromotionDisplay[] = promotionsRaw.map((promo: any) => ({
      ...promo,
      bankCard: promo.card, // Map card to bankCard
      activeDays: promo.activeDays as any[], // Cast activeDays
    }));

    return { promotions, banks };
  } catch (error) {
    console.error("Error fetching banking promotions:", error);
    return {
      promotions: [] as BankingPromotionDisplay[],
      banks: [] as Bank[],
    };
  }
}

export default async function ConfigurationPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.organizationId || !session.user.role) {
    return <p>Error: Organización no encontrada, usuario no autenticado, o rol no definido.</p>;
  }
  const organizationId = session.user.organizationId;
  const userRole = session.user.role;

  const [
    brandsData,
    colorsData,
    branchesData,
    paymentMethodsData,
    bankingPromotionsData,
    rawBanksWithCardsData,
    allCardTypesData,
    allBanksData,
  ] = await Promise.all([
    getOrganizationBrandsData(organizationId),
    getMotoColors(organizationId),
    getOrganizationBranches(organizationId),
    getPaymentMethodsData(organizationId),
    getBankingPromotionsData(organizationId),
    getBanksWithCards(organizationId),
    getAllCardTypes(),
    getAllBanks(),
  ]);

  // Transformar rawBanksWithCardsData a BankCardDisplay[] para ManageBankingPromotions
  const bankCardsForPromotions: BankCardDisplay[] = rawBanksWithCardsData.flatMap(
    (
      bwc, // bwc es un BankWithCards
    ) =>
      bwc.cards.map((card) => ({
        // Propiedades de BankCard (que BankCardDisplay extiende)
        id: card.id, // ID de la entidad BankCard (de la tabla intermedia)
        bankId: bwc.bank.id,
        cardTypeId: card.cardType.id,
        organizationId: organizationId, // organizationId de la sesión
        isEnabled: card.isEnabled,
        order: card.order,
        bank: {
          // Objeto bank completo según la definición de BankCard
          id: bwc.bank.id,
          name: bwc.bank.name,
          logoUrl: bwc.bank.logoUrl,
        },
        cardType: {
          // Objeto cardType completo según la definición de BankCard
          id: card.cardType.id,
          name: card.cardType.name,
          type: card.cardType.type, // Asegurarse que el tipo de 'type' coincida
          logoUrl: card.cardType.logoUrl,
        },
        // Propiedad adicional específica de BankCardDisplay
        displayName: `${card.cardType.name} - ${bwc.bank.name}`,
      })),
  );

  return (
    <div className="container max-w-none p-4">
      <h1 className="text-3xl font-bold mb-6">Configuración de la Organización</h1>
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="branches">Sucursales</TabsTrigger>
          <TabsTrigger value="brandsModels">Marcas y Modelos</TabsTrigger>
          <TabsTrigger value="colors">Colores</TabsTrigger>
          <TabsTrigger value="paymentMethods">Métodos de Pago</TabsTrigger>
          <TabsTrigger value="bankCards">Tarjetas Bancarias</TabsTrigger>
          <TabsTrigger value="bankingPromotions">Promociones</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
              <CardDescription>
                Aquí podrás ajustar la configuración general de tu organización.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p>
                  Próximamente: opciones de configuración general de la organización (nombre, logo,
                  etc.).
                </p>
                <p>ID de Organización: {organizationId}</p>
                <p>Rol de Usuario: {userRole}</p>
              </div>
              <div className="mt-6 pt-6 border-t">
                <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                  <SecuritySettings />
                </Suspense>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branches">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <ManageBranches initialBranchesData={branchesData} />
          </Suspense>
        </TabsContent>

        <TabsContent value="brandsModels">
          <ClientManageBrands
            initialOrganizationBrands={brandsData}
            organizationId={organizationId}
          />
        </TabsContent>

        <TabsContent value="colors">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <ManageColors initialColorsData={colorsData} organizationId={organizationId} />
          </Suspense>
        </TabsContent>

        <TabsContent value="paymentMethods">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <ManagePaymentMethods
              initialOrganizationMethods={paymentMethodsData.organizationMethods}
              availableMethods={paymentMethodsData.availableMethods}
              organizationId={organizationId}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="bankCards">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <ManageBankCards
              initialBanksWithCards={rawBanksWithCardsData}
              availableCardTypes={allCardTypesData}
              availableBanks={allBanksData}
              organizationId={organizationId}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="bankingPromotions">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <ManageBankingPromotions
              promotions={bankingPromotionsData.promotions}
              paymentMethods={paymentMethodsData.availableMethods}
              bankCards={bankCardsForPromotions}
              organizationId={organizationId}
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
