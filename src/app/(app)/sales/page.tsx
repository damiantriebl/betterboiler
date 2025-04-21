import { getMotorcycles, type MotorcycleTableRowData } from "@/actions/sales/get-motorcycles";
import { getClients } from "@/actions/clients/get-clients";
import SalesClientComponent from "./SalesClientComponent";
import type { Client } from "@prisma/client";

export default async function VentasPage() {
  // Usar el tipo específico en lugar de any
  let initialData: MotorcycleTableRowData[] = [];
  let clients: Client[] = [];

  try {
    const result = await getMotorcycles();
    // Asegurarse de que todas las relaciones, incluida reservation, estén presentes
    initialData = result.map((moto) => ({
      ...moto,
      estadoVenta: moto.estadoVenta,
      // Asegurarse de que se incluya la reserva con su monto
      reservation: moto.reservation,
    }));

    // Obtener clientes
    clients = await getClients();
  } catch (error) {
    console.error("Error fetching initial data in page.tsx:", error);
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Catálogo de Motos</h1>
        <p className="text-muted-foreground">
          Explora nuestra amplia selección de motocicletas disponibles
        </p>
      </div>
      {/* Renderizar SÓLO el Client Component, pasándole los datos completos */}
      <SalesClientComponent initialData={initialData} clients={clients} />
    </main>
  );
}
