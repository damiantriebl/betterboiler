"use client"; // <-- ¡Importante! Este es el Client Component

import { getOrganizationIdFromSession } from "@/actions/getOrganizationIdFromSession";
import type { MotorcycleTableRowData } from "@/actions/sales/get-motorcycles";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BankingPromotionDisplay } from "@/types/banking-promotions";
import type { Day } from "@/zod/banking-promotion-schemas";
import type { Brand, Client, Model, Motorcycle, MotorcycleState, Sucursal } from "@prisma/client";
import { useEffect, useState } from "react";
import MotorcycleTable from "./(table)/MotorcycleTable";
import { PromotionDayFilter } from "./PromotionDayFilter";
import { ReserveModal } from "./ReserveModal";
import type { MotorcycleWithFullDetails } from "@/types/motorcycle";
import type { Client as ClientType } from "@/types/client";

// Definir las props que espera este componente
interface SalesClientComponentProps {
  initialData: MotorcycleTableRowData[]; // Datos obtenidos de getMotorcycles
  clients?: Client[]; // Clientes para mostrar en dropdowns
  promotions?: BankingPromotionDisplay[]; // Promociones bancarias para el día actual (ahora opcional)
  allPromotions?: BankingPromotionDisplay[]; // Todas las promociones bancarias habilitadas (ahora opcional)
  currentDay?: Day; // Día actual
}

// Estado para la moto seleccionada para la venta
interface SelectedMotorcycleForSale extends Omit<MotorcycleTableRowData, "id" | "retailPrice"> {
  // Omitir para redefinir con tipos correctos
  id: number; // Asegurar que id es number si MotorcycleTableRowData lo tiene como string o diferente
  name: string; // Nombre compuesto para mostrar
  retailPrice: number; // Asegurar que retailPrice es number
}

export default function SalesClientComponent({
  initialData,
  clients = [],
  promotions = [],
  allPromotions = [],
  currentDay = "lunes",
}: SalesClientComponentProps) {
  console.log("SalesClientComponent initialData:", initialData);

  // Estado para las promociones filtradas - inicializar directamente con promotions
  const [filteredPromotions, setFilteredPromotions] =
    useState<BankingPromotionDisplay[]>(promotions);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<SelectedMotorcycleForSale | null>(
    null,
  );
  const [organizationId, setOrganizationId] = useState<string | null>(null); // State for organizationId
  const [orgIdError, setOrgIdError] = useState<string | null>(null); // State for error

  // Verificar si hay promociones disponibles (usando referencia estable)
  const hasPromotions = Array.isArray(allPromotions) && allPromotions.length > 0;

  // Actualizar las promociones filtradas SOLO en el primer render o cuando promotions cambie de referencia
  // Usamos JSON.stringify para comparar el contenido y evitar actualizaciones innecesarias
  useEffect(() => {
    if (promotions.length > 0) {
      setFilteredPromotions(promotions);
    }
  }, [promotions]);

  useEffect(() => {
    const fetchOrganizationId = async () => {
      try {
        const sessionResult = await getOrganizationIdFromSession();
        if (sessionResult.organizationId) {
          setOrganizationId(sessionResult.organizationId);
        } else {
          console.error("Failed to get organizationId:", sessionResult.error);
          setOrgIdError(sessionResult.error || "Failed to retrieve organization ID.");
          // Handle error appropriately, e.g., show a message to the user or disable certain features
        }
      } catch (error) {
        console.error("Error fetching organizationId:", error);
        setOrgIdError("An unexpected error occurred while fetching organization ID.");
      }
    };
    fetchOrganizationId();
  }, []); // Empty dependency array ensures this runs once on mount

  const handleOpenSaleModal = (motorcycle: MotorcycleTableRowData) => {
    const motorcycleName =
      `${motorcycle.brand?.name || "Marca"} ${motorcycle.model?.name || "Modelo"} ${motorcycle.year || ""}`.trim();

    if (typeof motorcycle.retailPrice !== "number") {
      console.error("Precio de venta no disponible o inválido:", motorcycle);
      alert("No se puede procesar la venta: precio no disponible.");
      return;
    }
    // Asegurarse de que el id de la motocicleta es un número, como espera ReserveModal
    const motorcycleIdAsNumber =
      typeof motorcycle.id === "string" ? Number.parseInt(motorcycle.id, 10) : motorcycle.id;
    if (Number.isNaN(motorcycleIdAsNumber)) {
      console.error("ID de motocicleta inválido:", motorcycle);
      alert("No se puede procesar la venta: ID de moto inválido.");
      return;
    }

    setSelectedMotorcycle({
      ...motorcycle, // Extiende el resto de las propiedades
      id: motorcycleIdAsNumber,
      name: motorcycleName,
      retailPrice: motorcycle.retailPrice,
    });
    setIsSaleModalOpen(true);
  };

  const handleCloseSaleModal = () => {
    setIsSaleModalOpen(false);
    setSelectedMotorcycle(null);
  };

  const handleSaleCompletion = (result: { type: string; payload: Record<string, unknown> }) => {
    console.log(`Proceso de venta completado: ${result.type}`, result.payload);
    alert(
      `¡${result.type === "current_account" ? "Cuenta corriente creada" : "Pago/Reserva registrado"} con éxito!`,
    );
    handleCloseSaleModal();
    // TODO: Implementar la actualización de la tabla de motocicletas.
  };

  return (
    <main className="flex flex-col gap-6 pr-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Catálogo de Motos</h1>
        <p className="text-muted-foreground">
          Explora nuestra amplia selección de motocicletas disponibles
        </p>
      </div>

      <Tabs defaultValue="catalog" className="w-full">
        <TabsList>
          <TabsTrigger value="catalog">Catálogo</TabsTrigger>
          {hasPromotions && <TabsTrigger value="promotions">Promociones</TabsTrigger>}
        </TabsList>

        <TabsContent value="catalog">
          <Card className="p-6">
            <MotorcycleTable
              initialData={initialData as MotorcycleWithFullDetails} // DEUDA TÉCNICA: Coincidir tipos MotorcycleWithFullDetails
              clients={clients as Client[]} // DEUDA TÉCNICA: Coincidir/unificar tipos Client
              activePromotions={hasPromotions ? filteredPromotions : []}
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
                                  {plan.installments} cuotas{" "}
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

      {selectedMotorcycle && (
        <ReserveModal
          open={isSaleModalOpen}
          onClose={handleCloseSaleModal}
          motorcycleId={selectedMotorcycle.id}
          motorcycleName={selectedMotorcycle.name}
          motorcyclePrice={selectedMotorcycle.retailPrice}
          clients={clients as Client[]} // DEUDA TÉCNICA: Coincidir/unificar tipos Client
          onSaleProcessCompleted={handleSaleCompletion}
        />
      )}
    </main>
  );
}
