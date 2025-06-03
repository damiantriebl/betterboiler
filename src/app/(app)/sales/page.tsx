import { getClients } from "@/actions/clients/manage-clients";
import { searchMotorcyclesFuzzy } from "@/actions/sales/fuzzy-search-motorcycles";
import {
  type MotorcycleTableData,
  getMotorcyclesOptimized,
} from "@/actions/sales/get-motorcycles-unified";
import { auth } from "@/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { BankingPromotionDisplay } from "@/types/banking-promotions";
import type { Client } from "@prisma/client";
import { MotorcycleState } from "@prisma/client";
import { AlertCircle } from "lucide-react";
import { headers } from "next/headers";
import { Suspense } from "react";
import SalesClientComponent from "./SalesClientComponent";

// Estados disponibles por defecto (motos que se pueden vender/gestionar)
// RESERVADO no se considera disponible para venta
const estadosDisponibles: MotorcycleState[] = [MotorcycleState.STOCK, MotorcycleState.PAUSADO];

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
async function SalesContent({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  try {
    // Await the searchParams promise
    const params = await searchParams;

    // Obtener session una sola vez
    const session = await auth.api.getSession({ headers: await headers() });
    const organizationId = session?.user?.organizationId;

    if (!organizationId) {
      throw new Error("No se pudo obtener la organización del usuario");
    }

    // Parsear parámetros de paginación
    const page = Number(params.page) || 1;
    const pageSize = Math.min(Number(params.pageSize) || 25, 100); // Límite máximo de 100
    const sortBy = typeof params.sortBy === "string" ? params.sortBy : "id";
    const sortOrder = typeof params.sortOrder === "string" ? params.sortOrder : "desc";

    // 🔍 FUZZY SEARCH: Extraer término de búsqueda
    const searchTerm = typeof params.search === "string" ? params.search.trim() : "";

    // DEBUG: Log de parámetros recibidos
    console.log("📝 [PAGE DEBUG] Parámetros recibidos:", {
      page,
      pageSize,
      sortBy,
      sortOrder,
      searchTerm,
      allParams: params,
    });

    // Parsear filtros
    const stateFilter = params.state
      ? Array.isArray(params.state)
        ? params.state
        : [params.state]
      : estadosDisponibles.map((estado) => estado.toString());

    const states = stateFilter
      .map((state) => {
        const motorcycleState = Object.values(MotorcycleState).find((s) => s.toString() === state);
        return motorcycleState;
      })
      .filter(Boolean) as MotorcycleState[];

    console.log(
      `[SALES] Loading page: page=${page}, pageSize=${pageSize}, sortBy=${sortBy}, states=${states.length}, search="${searchTerm}"`,
    );

    // 🚀 OPTIMIZACIÓN 4: Carga paralela optimizada con fuzzy search
    let motorcyclesRawData: any;

    // 🔍 FUZZY SEARCH: Si hay término de búsqueda, usar fuzzy search
    if (searchTerm && searchTerm.length > 0) {
      console.log(`🔍 [PAGE DEBUG] Usando fuzzy search para "${searchTerm}"`);

      // Para fuzzy search, obtenemos todos los resultados y luego paginamos en cliente
      // ya que el fuzzy search tiene su propio scoring
      const fuzzyResults = await searchMotorcyclesFuzzy(searchTerm, {
        filter: {
          state: states.length > 0 ? states : estadosDisponibles,
          limit: 500, // Límite alto para fuzzy search
        },
        optimization: {
          useCache: false,
          includeReservations: true,
          includeSupplier: false,
        },
      });

      console.log(`🔍 [PAGE DEBUG] Fuzzy search devolvió ${fuzzyResults.length} resultados`);

      // Simular estructura de paginación para compatibilidad
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedResults = fuzzyResults.slice(startIndex, endIndex);

      motorcyclesRawData = {
        data: paginatedResults,
        total: fuzzyResults.length,
        totalPages: Math.ceil(fuzzyResults.length / pageSize),
        currentPage: page,
        pageSize: pageSize,
      };

      console.log(
        `🔍 [PAGE DEBUG] Datos paginados: ${paginatedResults.length}/${fuzzyResults.length}`,
      );
    } else {
      console.log("📊 [PAGE DEBUG] Sin término de búsqueda, usando método optimizado normal");
      // Sin búsqueda, usar el método optimizado normal
      motorcyclesRawData = await getMotorcyclesOptimized({
        state: states.length > 0 ? states : estadosDisponibles,
        pagination: {
          page,
          pageSize,
          sortBy,
          sortOrder: sortOrder as "asc" | "desc",
        },
      });
      console.log(
        `📊 [PAGE DEBUG] Método normal devolvió ${motorcyclesRawData.data?.length || 0} resultados`,
      );
    }

    // Cargar datos auxiliares en paralelo
    const clientsData = await getClients();

    // Adaptar datos optimizados al formato esperado
    const motorcyclesData = adaptOptimizedToRowData(motorcyclesRawData.data || []);

    console.log(
      `[SALES] Data loaded successfully | Items: ${motorcyclesData.length}/${motorcyclesRawData.total} | Search: "${searchTerm}"`,
    );

    return (
      <SalesClientComponent
        initialData={motorcyclesData}
        clients={clientsData as Client[]}
        promotions={[]} // Sin promociones en sales
        pagination={{
          currentPage: page,
          pageSize,
          totalItems: motorcyclesRawData.total || 0,
          totalPages: motorcyclesRawData.totalPages || 1,
        }}
        searchParams={params}
      />
    );
  } catch (error) {
    console.error("[SALES] Error loading data:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido al cargar datos";
    return <SalesError error={errorMessage} />;
  }
}

// 🚀 OPTIMIZACIÓN 5: Página principal con Suspense y metadata
export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <div className="container max-w-none w-full p-4">
      <Suspense fallback={<SalesTableSkeleton />}>
        <SalesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// 🚀 METADATA OPTIMIZADA para mejor SEO y performance
export async function generateMetadata() {
  return {
    title: "Catálogo de Ventas - Better",
    description: "Gestiona y visualiza el inventario de motocicletas disponibles para venta",
  };
}
