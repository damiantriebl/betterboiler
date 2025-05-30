"use client";

import { getMotorcycles } from "@/actions/sales/get-motorcycles-unified";
import { SecurityModeToggle } from "@/components/custom/SecurityModeToggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMotorcycleFiltersStore } from "@/stores/motorcycle-filters-store";
import type { BankingPromotionDisplay } from "@/types/banking-promotions";
import type { MotorcycleWithFullDetails } from "@/types/motorcycle";
import { type Client, MotorcycleState } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MotorcycleTable from "../sales/(table)/MotorcycleTable";

interface StockClientComponentProps {
  initialData: MotorcycleWithFullDetails[];
  clients: Client[];
  activePromotions: BankingPromotionDisplay[];
}

export default function StockClientComponent({
  initialData,
  clients,
  activePromotions,
}: StockClientComponentProps) {
  const router = useRouter();

  // Usar el store para obtener los estados actuales del filtro
  const { filters, initializeFromData, updateAuxiliaryData } = useMotorcycleFiltersStore();

  // Estado local para las motocicletas
  const [motorcycles, setMotorcycles] = useState<MotorcycleWithFullDetails[]>(initialData);
  const [isLoadingData, setIsLoadingData] = useState(false);

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
    console.log("[DEBUG] Stock reloadMotorcycleData con estados:", selectedStates);
    setIsLoadingData(true);

    try {
      // Si selectedStates incluye todos los estados, mostrar todas las motos
      const allStates = Object.values(MotorcycleState);
      const shouldShowAll = selectedStates.length === allStates.length;

      let newData: MotorcycleWithFullDetails[];
      if (shouldShowAll) {
        const allMotorcycles = await getMotorcycles({});
        newData = allMotorcycles as MotorcycleWithFullDetails[];
      } else {
        const filteredMotorcycles = await getMotorcycles({
          filter: { state: selectedStates },
        });
        newData = filteredMotorcycles as MotorcycleWithFullDetails[];
      }

      setMotorcycles(newData);
      // Usar updateAuxiliaryData para no sobrescribir filtros
      updateAuxiliaryData(newData);
      console.log("[DEBUG] Stock datos recargados, total motos:", newData.length);
    } catch (error) {
      console.error("Error recargando datos del stock:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Función para manejar cambios de filtro que requieren recarga de datos
  const handleFilterChange = async (selectedStates: MotorcycleState[]) => {
    console.log("[DEBUG] Stock handleFilterChange:", selectedStates);

    // Siempre verificar si necesitamos recargar datos
    if (needsDataReload(selectedStates)) {
      await reloadMotorcycleData(selectedStates);
    }
  };

  // Función para recibir los estados actuales del filtro desde MotorcycleTable
  const handleCurrentStatesChange = (currentStates: MotorcycleState[]) => {
    console.log("[DEBUG] Stock handleCurrentStatesChange:", currentStates);
  };

  // Función para actualizar el estado de una moto específica
  const handleMotorcycleUpdate = (motorcycleId: number, newState: MotorcycleState) => {
    console.log("[DEBUG] Stock handleMotorcycleUpdate:", {
      motorcycleId,
      newState,
      currentFilterStates: filters.estadosVenta,
    });

    const existingMoto = motorcycles.find((m) => m.id === motorcycleId);

    if (existingMoto) {
      setMotorcycles((prev) =>
        prev.map((moto) => (moto.id === motorcycleId ? { ...moto, state: newState } : moto)),
      );

      if (!filters.estadosVenta.includes(newState)) {
        console.log("[DEBUG] Stock: Moto cambió a estado no visible, será filtrada de la vista");
      }
    } else {
      const shouldBeVisible = filters.estadosVenta.includes(newState);

      if (shouldBeVisible) {
        console.log(
          "[DEBUG] Stock: Moto no existe en lista actual pero debería ser visible, recargando con filtro actual:",
          filters.estadosVenta,
        );
        reloadMotorcycleData(filters.estadosVenta);
      } else {
        console.log("[DEBUG] Stock: Moto cambió a estado pero no es visible en el filtro actual");
      }
    }
  };

  // Sincronizar con initialData cuando cambie
  useEffect(() => {
    setMotorcycles(initialData);
  }, [initialData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Stock</h1>
          <p className="text-muted-foreground">
            Administra el inventario de motocicletas de forma eficiente
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SecurityModeToggle variant="badge" />
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Inventario de Motocicletas
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MotorcycleTable
            initialData={motorcycles}
            clients={clients}
            activePromotions={activePromotions}
            onMotorcycleUpdate={handleMotorcycleUpdate}
            onFilterChange={handleFilterChange}
            onCurrentStatesChange={handleCurrentStatesChange}
            isLoading={isLoadingData}
          />
        </CardContent>
      </Card>
    </div>
  );
}
