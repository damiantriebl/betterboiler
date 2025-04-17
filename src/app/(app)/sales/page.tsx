
import { MotorcycleWithDetails, getMotorcycles } from "@/actions/sales/get-motorcycles";
import SalesClientComponent from "./SalesClientComponent";

export default async function VentasPage() {
    // Dar tipo explícito a initialData
    let initialData: MotorcycleWithDetails[] = [];
    try {
        const result = await getMotorcycles();
        // Ajustar cómo se extraen los datos según la estructura devuelta por getMotorcycles
        // Ejemplo si getMotorcycles devuelve el array directamente:
        initialData = result ?? [];
        // Ejemplo si getMotorcycles devuelve { success: boolean, data: [...] }:
        // initialData = (result && Array.isArray(result)) ? result : []; // O la lógica correcta
    } catch (error) {
        console.error("Error fetching initial motorcycles in page.tsx:", error);
    }

    return (
        <main className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">Catálogo de Motos</h1>
                <p className="text-muted-foreground">
                    Explora nuestra amplia selección de motocicletas disponibles
                </p>
            </div>
            {/* Renderizar SÓLO el Client Component, pasándole los datos */}
            <SalesClientComponent initialData={initialData} />
        </main>
    );
} 