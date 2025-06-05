"use client"; // <-- ¡Importante! Este es el Client Component

import type { MotorcycleTableData } from "@/actions/sales/get-motorcycles-unified";
import { getOrganizationIdFromSession } from "@/actions/util";
import { SecurityModeToggle } from "@/components/custom/SecurityModeToggle";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { usePerformanceMonitor } from "@/hooks/use-performance-monitor"; // 🚨 TEMPORALMENTE COMENTADO
import { useMotorcycleFiltersStore } from "@/stores/motorcycle-filters-store";
import type { BankingPromotionDisplay } from "@/types/banking-promotions";
import type { MotorcycleWithFullDetails } from "@/types/motorcycle";
import type { Day } from "@/zod/banking-promotion-schemas";
import type { Client } from "@prisma/client";
import { MotorcycleState } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import MotorcycleTable from "./(table)/MotorcycleTable";
import { PromotionDayFilter } from "./PromotionDayFilter";
import { ReservationModal } from "./components/ReservationModal";

// Estados disponibles por defecto (RESERVADO no está disponible para venta)
const estadosDisponibles: MotorcycleState[] = [MotorcycleState.STOCK, MotorcycleState.PAUSADO];

// Definir las props que espera este componente
interface SalesClientComponentProps {
  initialData: MotorcycleTableData[]; // Datos obtenidos de getMotorcycles
  clients?: Client[]; // Clientes para mostrar en dropdowns
  promotions?: BankingPromotionDisplay[]; // Promociones bancarias para el día actual (ahora opcional)
  allPromotions?: BankingPromotionDisplay[]; // Todas las promociones bancarias habilitadas (ahora opcional)
  currentDay?: Day; // Día actual
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function SalesClientComponent({
  initialData,
  clients = [],
  promotions = [],
  allPromotions = [],
  currentDay = "lunes",
  pagination,
  searchParams,
}: SalesClientComponentProps) {
  console.log("SalesClientComponent initialData:", initialData);

  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // 🚀 STORE: Obtener función para inicializar datos auxiliares
  const { initializeFromData } = useMotorcycleFiltersStore();

  // 🔧 FIXED: Evitar performance.now() en el estado inicial
  const [isMounted, setIsMounted] = useState(false);

  // Estado para las promociones filtradas - inicializar directamente con promotions
  const [filteredPromotions, setFilteredPromotions] =
    useState<BankingPromotionDisplay[]>(promotions);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [orgIdError, setOrgIdError] = useState<string | null>(null);

  // Estado local para las motocicletas - convertir de MotorcycleTableData a MotorcycleWithFullDetails
  const [motorcycles, setMotorcycles] = useState<MotorcycleWithFullDetails[]>(
    initialData as MotorcycleWithFullDetails[],
  );

  // Estado para el modal de reserva
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [selectedMotorcycleForReservation, setSelectedMotorcycleForReservation] =
    useState<MotorcycleWithFullDetails | null>(null);

  // Verificar si hay promociones disponibles (usando referencia estable)
  const hasPromotions = Array.isArray(allPromotions) && allPromotions.length > 0;

  // 🔧 FIXED: Marcar como montado para evitar problemas de hidratación
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 🔧 SIMPLIFICADO: Actualizar las promociones filtradas solo al inicio
  useEffect(() => {
    if (promotions.length > 0) {
      setFilteredPromotions(promotions);
    }
  }, [promotions]); // 🔧 INCLUIR PROMOTIONS EN DEPENDENCIAS

  // 🔧 SIMPLIFICADO: Sincronizar el estado local de motorcycles con initialData
  useEffect(() => {
    setMotorcycles(initialData as MotorcycleWithFullDetails[]);
  }, [initialData]);

  // 🚀 INICIALIZAR STORE: Extraer datos auxiliares para filtros
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      console.log("🚀 [STORE] Inicializando datos auxiliares para filtros...");
      initializeFromData(initialData);
      console.log("✅ [STORE] Datos auxiliares inicializados correctamente");
    }
  }, [initialData, initializeFromData]);

  // 🔧 SIMPLIFICADO: Obtener organizationId de forma más simple
  useEffect(() => {
    const fetchOrganizationId = async () => {
      try {
        console.log("🔄 Iniciando obtención de organizationId...");
        const orgSessionResult = await getOrganizationIdFromSession();
        console.log("📝 Resultado de getOrganizationIdFromSession:", orgSessionResult);

        if (orgSessionResult?.organizationId) {
          console.log("✅ OrganizationId obtenido correctamente:", orgSessionResult.organizationId);
          setOrganizationId(orgSessionResult.organizationId);
        } else {
          console.error("Failed to get organizationId:", orgSessionResult?.error);
          setOrgIdError(orgSessionResult?.error || "Failed to retrieve organization ID.");
        }
      } catch (error) {
        console.error("Error fetching organizationId:", error);
        setOrgIdError("An unexpected error occurred while fetching organization ID.");
      }
    };
    fetchOrganizationId();
  }, []); // 🔧 SOLO AL MONTAR

  // 🚀 FUNCIÓN IMPLEMENTADA: Manejar apertura de modal de venta
  const handleOpenSaleModal = (motorcycle: MotorcycleWithFullDetails) => {
    if (typeof motorcycle.retailPrice !== "number") {
      console.error("Precio de venta no disponible o inválido:", motorcycle);
      alert("No se puede procesar la venta: precio no disponible.");
      return;
    }

    const motorcycleIdAsNumber =
      typeof motorcycle.id === "string" ? Number.parseInt(motorcycle.id, 10) : motorcycle.id;
    if (Number.isNaN(motorcycleIdAsNumber)) {
      console.error("ID de motocicleta inválido:", motorcycle);
      alert("No se puede procesar la venta: ID de moto inválido.");
      return;
    }

    // 🔧 FIXED: Verificar que estamos en el cliente antes de usar localStorage
    if (typeof window !== "undefined") {
      // Limpiar localStorage de la venta específica para asegurar que inicie en step 0
      const localStorageKey = `saleProcess-${motorcycleIdAsNumber}`;
      localStorage.removeItem(localStorageKey);
    }

    // Redirigir a la página de venta con stepper
    startTransition(() => {
      router.push(`/sales/${motorcycleIdAsNumber}`);
    });
  };

  // 🚀 FUNCIÓN IMPLEMENTADA: Abrir el modal de reserva
  const handleOpenReservationModal = (motorcycle: MotorcycleWithFullDetails) => {
    setSelectedMotorcycleForReservation(motorcycle);
    setIsReservationModalOpen(true);
  };

  // 🚀 FUNCIÓN IMPLEMENTADA: Cerrar el modal de reserva
  const handleCloseReservationModal = () => {
    setIsReservationModalOpen(false);
    setSelectedMotorcycleForReservation(null);
  };

  // 🚀 FUNCIÓN IMPLEMENTADA: Manejar el éxito de la reserva
  const handleReservationSuccess = () => {
    // Cerrar el modal
    setIsReservationModalOpen(false);
    setSelectedMotorcycleForReservation(null);

    // Recargar la página para obtener datos actualizados
    startTransition(() => {
      router.refresh();
    });
  };

  // 🚀 FUNCIÓN IMPLEMENTADA: Cambios de paginación del lado del servidor
  const handlePageChange = (newPage: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParamsHook.toString());
      params.set("page", newPage.toString());
      router.push(`/sales?${params.toString()}`);
    });
  };

  // 🚀 FUNCIÓN IMPLEMENTADA: Cambios de tamaño de página
  const handlePageSizeChange = (newPageSize: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParamsHook.toString());
      params.set("pageSize", newPageSize.toString());
      params.set("page", "1"); // Reset a la primera página
      router.push(`/sales?${params.toString()}`);
    });
  };

  // 🚀 FUNCIÓN IMPLEMENTADA: Filtros del lado del servidor
  const handleFilterChange = (filterType: string, value: string | MotorcycleState[] | number[]) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParamsHook.toString());

      if (filterType === "state" && Array.isArray(value)) {
        // Manejar filtro de estados
        params.delete("state"); // Limpiar estados anteriores
        for (const state of value) {
          params.append("state", state.toString());
        }
      } else if (filterType === "search") {
        // 🔍 FUZZY SEARCH: Manejar término de búsqueda
        if (value && typeof value === "string" && value.trim()) {
          params.set("search", value.trim());
        } else {
          params.delete("search"); // Limpiar búsqueda si está vacía
        }
      } else if (filterType === "sortBy") {
        params.set("sortBy", value as string);
      } else if (filterType === "sortOrder") {
        params.set("sortOrder", value as string);
      }

      params.set("page", "1"); // Reset a la primera página cuando se cambian filtros
      router.push(`/sales?${params.toString()}`);
    });
  };

  // 🚀 FUNCIÓN IMPLEMENTADA: Actualizar el estado de una moto específica
  const handleMotorcycleUpdate = (motorcycleId: number, newState: MotorcycleState) => {
    console.log("[DEBUG] handleMotorcycleUpdate:", { motorcycleId, newState });

    // Actualizar el estado local optimistamente
    setMotorcycles((prev) =>
      prev.map((moto) => (moto.id === motorcycleId ? { ...moto, state: newState } : moto)),
    );

    // Refrescar los datos del servidor después de un delay
    setTimeout(() => {
      startTransition(() => {
        router.refresh();
      });
    }, 100);
  };

  // 🔧 FIXED: No renderizar hasta que esté montado para evitar errores de hidratación
  if (!isMounted) {
    return (
      <div className="container max-w-none w-full p-4">
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
      </div>
    );
  }

  return (
    <main className="flex flex-col gap-6 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Catálogo de Motos</h1>
          <p className="text-muted-foreground">
            Explora nuestra amplia selección de motocicletas disponibles
          </p>
        </div>
      </div>

      <Card className="p-6">
        {/* 🔍 Filtros siempre visibles (sin skeleton) */}
        <MotorcycleTable
          initialData={motorcycles}
          clients={clients as Client[]}
          activePromotions={hasPromotions ? filteredPromotions : []}
          onInitiateSale={handleOpenSaleModal}
          onInitiateReservation={handleOpenReservationModal}
          onMotorcycleUpdate={handleMotorcycleUpdate}
          isLoading={isPending}
          serverPagination={{
            currentPage: pagination.currentPage,
            pageSize: pagination.pageSize,
            totalItems: pagination.totalItems,
            totalPages: pagination.totalPages,
            onPageChange: handlePageChange,
            onPageSizeChange: handlePageSizeChange,
            onFilterChange: handleFilterChange,
          }}
        />
      </Card>

      {/* Modal de Reserva */}
      <ReservationModal
        isOpen={isReservationModalOpen}
        onClose={handleCloseReservationModal}
        onSuccess={handleReservationSuccess}
        motorcycle={selectedMotorcycleForReservation}
        clients={clients}
      />
    </main>
  );
}
