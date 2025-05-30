"use client"; // <-- ¡Importante! Este es el Client Component

import type { MotorcycleTableData } from "@/actions/sales/get-motorcycles-unified";
import { getMotorcycles } from "@/actions/sales/get-motorcycles-unified";
import { getOrganizationIdFromSession } from "@/actions/util";
import { SecurityModeToggle } from "@/components/custom/SecurityModeToggle";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMotorcycleFiltersStore } from "@/stores/motorcycle-filters-store";
import type { BankingPromotionDisplay } from "@/types/banking-promotions";
import type { MotorcycleWithFullDetails } from "@/types/motorcycle";
import type { Day } from "@/zod/banking-promotion-schemas";
import type { Client } from "@prisma/client";
import { MotorcycleState } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MotorcycleTable from "./(table)/MotorcycleTable";
import { PromotionDayFilter } from "./PromotionDayFilter";
import { ReservationModal } from "./components/ReservationModal";

// Estados disponibles por defecto
const estadosDisponibles: MotorcycleState[] = [
  MotorcycleState.STOCK,
  MotorcycleState.RESERVADO,
  MotorcycleState.PAUSADO,
];

// Definir las props que espera este componente
interface SalesClientComponentProps {
  initialData: MotorcycleTableData[]; // Datos obtenidos de getMotorcycles
  clients?: Client[]; // Clientes para mostrar en dropdowns
  promotions?: BankingPromotionDisplay[]; // Promociones bancarias para el día actual (ahora opcional)
  allPromotions?: BankingPromotionDisplay[]; // Todas las promociones bancarias habilitadas (ahora opcional)
  currentDay?: Day; // Día actual
}

export default function SalesClientComponent({
  initialData,
  clients = [],
  promotions = [],
  allPromotions = [],
  currentDay = "lunes",
}: SalesClientComponentProps) {
  console.log("SalesClientComponent initialData:", initialData);

  const router = useRouter();

  // Estado para las promociones filtradas - inicializar directamente con promotions
  const [filteredPromotions, setFilteredPromotions] =
    useState<BankingPromotionDisplay[]>(promotions);
  const [organizationId, setOrganizationId] = useState<string | null>(null); // State for organizationId
  const [orgIdError, setOrgIdError] = useState<string | null>(null); // State for error

  // Usar el store para obtener los estados actuales del filtro
  const { filters, initializeFromData, updateAuxiliaryData } = useMotorcycleFiltersStore();

  // Estado local para las motocicletas - convertir de MotorcycleTableData a MotorcycleWithFullDetails
  const [motorcycles, setMotorcycles] = useState<MotorcycleWithFullDetails[]>(
    initialData as MotorcycleWithFullDetails[],
  );
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [currentFilterStates, setCurrentFilterStates] =
    useState<MotorcycleState[]>(estadosDisponibles);

  // Estado para el modal de reserva
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [selectedMotorcycleForReservation, setSelectedMotorcycleForReservation] =
    useState<MotorcycleWithFullDetails | null>(null);

  // Verificar si hay promociones disponibles (usando referencia estable)
  const hasPromotions = Array.isArray(allPromotions) && allPromotions.length > 0;

  // Actualizar las promociones filtradas SOLO en el primer render o cuando promotions cambie de referencia
  // Usamos JSON.stringify para comparar el contenido y evitar actualizaciones innecesarias
  useEffect(() => {
    if (promotions.length > 0) {
      setFilteredPromotions(promotions);
    }
  }, [promotions]);

  // Sincronizar el estado local de motorcycles con initialData
  useEffect(() => {
    setMotorcycles(initialData as MotorcycleWithFullDetails[]);
  }, [initialData]);

  useEffect(() => {
    const fetchOrganizationId = async () => {
      try {
        console.log("🔄 Iniciando obtención de organizationId...");
        console.log(
          "🔍 Función getOrganizationIdFromSession existe:",
          typeof getOrganizationIdFromSession,
        );

        const orgSessionResult = await getOrganizationIdFromSession(); // Renombrado para claridad

        console.log("📝 Resultado de getOrganizationIdFromSession:", orgSessionResult);

        // Verificar que orgSessionResult no sea undefined o null
        if (!orgSessionResult) {
          console.error("getOrganizationIdFromSession returned undefined or null");
          setOrgIdError("Error inesperado: resultado de sesión indefinido.");
          return;
        }

        // Verificar que el objeto tenga la estructura esperada
        if (typeof orgSessionResult !== "object" || !("organizationId" in orgSessionResult)) {
          console.error(
            "getOrganizationIdFromSession returned unexpected format:",
            orgSessionResult,
          );
          setOrgIdError("Error inesperado: formato de resultado de sesión inválido.");
          return;
        }

        if (orgSessionResult.organizationId) {
          console.log("✅ OrganizationId obtenido correctamente:", orgSessionResult.organizationId);
          setOrganizationId(orgSessionResult.organizationId);
        } else {
          console.error("Failed to get organizationId:", orgSessionResult.error);
          setOrgIdError(orgSessionResult.error || "Failed to retrieve organization ID.");
          // Handle error appropriately, e.g., show a message to the user or disable certain features
        }
      } catch (error) {
        console.error("Error fetching organizationId:", error);
        setOrgIdError("An unexpected error occurred while fetching organization ID.");
      }
    };
    fetchOrganizationId();
  }, []); // Empty dependency array ensures this runs once on mount

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

    // Limpiar localStorage de la venta específica para asegurar que inicie en step 0
    const localStorageKey = `saleProcess-${motorcycleIdAsNumber}`;
    localStorage.removeItem(localStorageKey);

    // Redirigir a la página de venta con stepper
    router.push(`/sales/${motorcycleIdAsNumber}`);
  };

  // Función para abrir el modal de reserva
  const handleOpenReservationModal = (motorcycle: MotorcycleWithFullDetails) => {
    setSelectedMotorcycleForReservation(motorcycle);
    setIsReservationModalOpen(true);
  };

  // Función para cerrar el modal de reserva
  const handleCloseReservationModal = () => {
    setIsReservationModalOpen(false);
    setSelectedMotorcycleForReservation(null);
  };

  // Función para manejar el éxito de la reserva
  const handleReservationSuccess = () => {
    if (selectedMotorcycleForReservation) {
      // Actualizar el estado local de la moto específica
      setMotorcycles((prev) =>
        prev.map((moto) =>
          moto.id === selectedMotorcycleForReservation.id
            ? { ...moto, state: MotorcycleState.RESERVADO }
            : moto,
        ),
      );
    }

    // Cerrar el modal
    setIsReservationModalOpen(false);
    setSelectedMotorcycleForReservation(null);

    // También revalidar usando router.refresh() como backup
    router.refresh();
  };

  // Función para verificar si los estados seleccionados requieren recarga de datos
  const needsDataReload = (selectedStates: MotorcycleState[]) => {
    const currentStates = new Set(motorcycles.map((m) => m.state));
    const hasNewStates = selectedStates.some((state) => !currentStates.has(state));
    const hasRemovedStates = Array.from(currentStates).some(
      (state) => !selectedStates.includes(state),
    );
    return hasNewStates || hasRemovedStates;
  };

  // Función para recargar datos con estados específicos
  const reloadMotorcycleData = async (selectedStates: MotorcycleState[]) => {
    console.log("[DEBUG] Sales reloadMotorcycleData con estados:", selectedStates);
    setIsLoadingData(true);

    try {
      // Si selectedStates incluye todos los estados, mostrar todas las motos
      const allStates = Object.values(MotorcycleState);
      const shouldShowAll = selectedStates.length === allStates.length;

      let newData: MotorcycleTableData[];
      if (shouldShowAll) {
        const allMotorcycles = await getMotorcycles({});
        newData = allMotorcycles;
      } else {
        const filteredMotorcycles = await getMotorcycles({
          filter: { state: selectedStates },
        });
        newData = filteredMotorcycles;
      }

      setMotorcycles(newData as MotorcycleWithFullDetails[]);
      // Usar updateAuxiliaryData para no sobrescribir filtros
      updateAuxiliaryData(newData);
      console.log("[DEBUG] Sales datos recargados, total motos:", newData.length);
    } catch (error) {
      console.error("Error recargando datos de ventas:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Función para manejar cambios en filtros que requieren recarga
  const handleFilterChange = async (selectedStates: MotorcycleState[]) => {
    console.log("[DEBUG] Sales handleFilterChange:", selectedStates);

    // Actualizar el estado del filtro actual
    setCurrentFilterStates(selectedStates);

    // Siempre verificar si necesitamos recargar datos
    if (needsDataReload(selectedStates)) {
      await reloadMotorcycleData(selectedStates);
    }
  };

  // Función para recibir los estados actuales del filtro desde MotorcycleTable
  const handleCurrentStatesChange = (currentStates: MotorcycleState[]) => {
    setCurrentFilterStates(currentStates);
  };

  // Función para actualizar el estado de una moto específica
  const handleMotorcycleUpdate = (motorcycleId: number, newState: MotorcycleState) => {
    console.log("[DEBUG] handleMotorcycleUpdate:", { motorcycleId, newState, currentFilterStates });

    // Verificar si la moto existe en la lista actual
    const existingMoto = motorcycles.find((m) => m.id === motorcycleId);

    if (existingMoto) {
      // Si la moto existe, actualizar su estado localmente
      setMotorcycles((prev) =>
        prev.map((moto) => (moto.id === motorcycleId ? { ...moto, state: newState } : moto)),
      );

      // Si el nuevo estado no está en el filtro actual, la moto debería desaparecer
      if (!currentFilterStates.includes(newState)) {
        console.log("[DEBUG] Moto cambió a estado no visible, será filtrada de la vista");
      }
    } else {
      // Si la moto no existe en la lista actual (ej: era ELIMINADO y ahora es STOCK)
      // Y el nuevo estado debería estar visible según el filtro actual, recargar los datos
      const shouldBeVisible = currentFilterStates.includes(newState);

      if (shouldBeVisible) {
        console.log(
          "[DEBUG] Moto no existe en lista actual pero debería ser visible, recargando con filtro actual:",
          currentFilterStates,
        );
        // Recargar con los estados del filtro actual para traer la moto nueva
        reloadMotorcycleData(currentFilterStates);
      } else {
        console.log("[DEBUG] Moto cambió a estado pero no es visible en el filtro actual");
      }
    }
  };

  return (
    <main className="flex flex-col gap-6 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Catálogo de Motos</h1>
          <p className="text-muted-foreground">
            Explora nuestra amplia selección de motocicletas disponibles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SecurityModeToggle variant="badge" />
        </div>
      </div>

      <Tabs defaultValue="catalog" className="w-full">
        <TabsContent value="catalog">
          <Card className="p-6">
            <MotorcycleTable
              initialData={motorcycles}
              clients={clients as Client[]}
              activePromotions={hasPromotions ? filteredPromotions : []}
              onInitiateSale={handleOpenSaleModal}
              onInitiateReservation={handleOpenReservationModal}
              onMotorcycleUpdate={handleMotorcycleUpdate}
              onFilterChange={handleFilterChange}
              onCurrentStatesChange={handleCurrentStatesChange}
              isLoading={isLoadingData}
            />
          </Card>
        </TabsContent>

        {hasPromotions && (
          <TabsContent value="promotions">
            <Card className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <PromotionDayFilter
                    promotions={allPromotions.filter((p) => p.isEnabled)}
                    onFilteredPromotionsChange={setFilteredPromotions}
                    currentDay={currentDay}
                  />
                </div>
                <div className="md:col-span-2">
                  <h2 className="text-xl font-bold mb-4">Promociones Activas</h2>
                  {filteredPromotions.length === 0 ? (
                    <p className="text-muted-foreground">
                      No hay promociones activas para el día seleccionado.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {filteredPromotions.map((promotion) => (
                        <Card key={promotion.id} className="p-4">
                          <h3 className="text-lg font-semibold">{promotion.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {promotion.description || "Sin descripción"}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {promotion.discountRate ? (
                              <div className="text-green-600 font-medium">
                                {promotion.discountRate}% descuento
                              </div>
                            ) : promotion.surchargeRate ? (
                              <div className="text-amber-600 font-medium">
                                {promotion.surchargeRate}% recargo
                              </div>
                            ) : null}

                            {promotion.installmentPlans
                              ?.filter((p) => p.isEnabled)
                              .map((plan) => (
                                <div key={plan.id} className="text-blue-600 text-sm">
                                  {plan.installments} cuotas
                                  {plan.interestRate === 0
                                    ? "sin interés"
                                    : `(${plan.interestRate}%)`}
                                </div>
                              ))}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>

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
