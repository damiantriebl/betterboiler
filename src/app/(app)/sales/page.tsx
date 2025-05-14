import { getClients } from "@/actions/clients/get-clients";
import { type MotorcycleTableRowData, getMotorcycles } from "@/actions/sales/get-motorcycles";
import type { Client } from "@prisma/client";
import SalesClientComponent from "./SalesClientComponent";

export default async function VentasPage() {
  // Usar el tipo específico en lugar de any
  let initialData: MotorcycleTableRowData[] = [];
  let clients: Client[] = [];

  try {
    // Obtener datos en paralelo para mejorar rendimiento
    const [motorcyclesData, clientsData] = await Promise.all([
      getMotorcycles({}), // Pasamos un objeto vacío como opciones
      getClients(), // No necesita parámetros
    ]);

    // Asignar resultados
    initialData = motorcyclesData;
    clients = clientsData;

    // Renderizar componente cliente con datos iniciales
    return <SalesClientComponent initialData={initialData} clients={clients} />;
  } catch (error) {
    console.error("Error cargando datos para la página de ventas:", error);
  }

  // Fallback en caso de error o sin datos
  return <SalesClientComponent initialData={initialData} clients={clients} />;
}
