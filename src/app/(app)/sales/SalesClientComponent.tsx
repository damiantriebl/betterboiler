"use client"; // <-- ¡Importante! Este es el Client Component

import { Card } from "@/components/ui/card";
import MotorcycleTable from "./MotorcycleTable"; // Asegúrate que MotorcycleTable esté en la misma carpeta
// Importar los tipos necesarios
import type { Motorcycle, MotorcycleState, Brand, Model, Sucursal, Client } from "@prisma/client";
import type { MotorcycleTableRowData } from "@/actions/sales/get-motorcycles";

// Definir las props que espera este componente
interface SalesClientComponentProps {
  initialData: MotorcycleTableRowData[]; // Datos obtenidos de getMotorcycles
  clients?: Client[]; // Clientes para mostrar en dropdowns
}

export default function SalesClientComponent({
  initialData,
  clients = [],
}: SalesClientComponentProps) {
  console.log("SalesClientComponent initialData:", initialData); // Log para debug

  // El JSX que renderiza la UI del cliente
  return (
    <Card className="p-6">
      {/* Usar directamente MotorcycleTable que tiene sus propios filtros */}
      <MotorcycleTable
        // Convertir MotorcycleTableRowData al tipo que espera MotorcycleTable (MotorcycleWithRelations)
        // biome-ignore lint/suspicious/noExplicitAny: TODO: Refactorizar tipos. MotorcycleTable espera MotorcycleWithFullDetails[] pero recibe MotorcycleTableRowData[].
        initialData={initialData as any}
        // TODO: Refactorizar tipos. MotorcycleTable espera ClientColumn[] pero recibe Client[].
        // biome-ignore lint/suspicious/noExplicitAny: TODO: Refactorizar tipos. MotorcycleTable espera ClientColumn[] pero recibe Client[].
        clients={clients as any}
      />
    </Card>
  );
}
