import { getClients } from "@/actions/clients/manage-clients";
import { type MotorcycleTableData, getMotorcyclesOptimized } from "@/actions/sales/get-motorcycles-unified";
import { getOrganizationBankingPromotions } from "@/actions/banking-promotions/get-banking-promotions";
import { auth } from "@/auth";
import { headers } from "next/headers";
import type { Client } from "@prisma/client";
import type { BankingPromotionDisplay } from "@/types/banking-promotions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Suspense } from "react";
import SalesClientComponent from "./SalesClientComponent";

// 🚀 ADAPTADOR: Convertir MotorcycleTableData a formato compatible
function adaptOptimizedToRowData(optimized: MotorcycleTableData[]): MotorcycleTableData[] {
  return optimized;
}

// 🚀 OPTIMIZACIÓN 1: Componente de Loading específico para sales
function SalesTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      </div>
      <div className="h-96 bg-muted animate-pulse rounded" />
      <div className="flex justify-between">
        <div className="h-6 w-24 bg-muted animate-pulse rounded" />
        <div className="h-6 w-16 bg-muted animate-pulse rounded" />
      </div>
    </div>
  );
}

// 🚀 OPTIMIZACIÓN 2: Error boundary específico
function SalesError({ error }: { error: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error al cargar catálogo de ventas</AlertTitle>
      <AlertDescription className="mt-2">
        {error}
        <br />
        <span className="text-sm text-muted-foreground mt-1 block">
          Intenta recargar la página o contacta al administrador.
        </span>
      </AlertDescription>
    </Alert>
  );
}

// 🚀 OPTIMIZACIÓN 3: Componente separado para datos async con cache
async function SalesContent() {
  try {
    // Obtener session una sola vez
    const session = await auth.api.getSession({ headers: await headers() });
    const organizationId = session?.user?.organizationId;

    if (!organizationId) {
      throw new Error("No se pudo obtener la organización del usuario");
    }

    // 🚀 OPTIMIZACIÓN 4: Carga paralela optimizada con filtros
    const [motorcyclesRawData, clientsData, promotionsData] = await Promise.all([
      // Solo motos disponibles para venta usando cache optimizado
      getMotorcyclesOptimized({
        state: ['STOCK', 'RESERVADO'] // Solo estados relevantes para ventas
      }),
      getClients(),
      // Promociones solo si son necesarias
      getOrganizationBankingPromotions(organizationId).catch(() => [])
    ]);

    // Adaptar datos optimizados al formato esperado
    const motorcyclesData = adaptOptimizedToRowData(motorcyclesRawData);

    return (
      <SalesClientComponent
        initialData={motorcyclesData}
        clients={clientsData as Client[]}
        promotions={promotionsData as BankingPromotionDisplay[]}
      />
    );
  } catch (error) {
    console.error("Error cargando datos para la página de ventas:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido al cargar datos";
    return <SalesError error={errorMessage} />;
  }
}

// 🚀 OPTIMIZACIÓN 5: Página principal con Suspense y metadata
export default async function VentasPage() {
  return (
    <div className="container mx-auto p-4">
      <Suspense fallback={<SalesTableSkeleton />}>
        <SalesContent />
      </Suspense>
    </div>
  );
}
