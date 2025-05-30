import { getMotorcyclesForTransfer } from "@/actions/logistics/get-motorcycles-for-transfer";
import { getLogisticProviders } from "@/actions/logistics/logistic-providers";
import { getTransfersInTransit } from "@/actions/logistics/motorcycle-transfers";
import { getBranchesForOrganizationAction } from "@/actions/util";
import LogisticClient from "./LogisticClient";

export default async function LogisticPage() {
  try {
    // Obtener datos en paralelo
    const [motorcyclesResult, providersResult, branches, transfersResult] = await Promise.all([
      getMotorcyclesForTransfer(),
      getLogisticProviders(),
      getBranchesForOrganizationAction(),
      getTransfersInTransit(),
    ]);

    console.log("🔍 Resultados de la página logística:");
    console.log("🔍 motorcyclesResult.success:", motorcyclesResult.success);
    console.log("🔍 providersResult.success:", providersResult.success);
    console.log("🔍 transfersResult.success:", transfersResult.success);
    console.log("🔍 transfersResult.transfers.length:", transfersResult.transfers?.length || 0);
    console.log("🔍 transfersResult.transfers:", transfersResult.transfers);

    if (!motorcyclesResult.success) {
      throw new Error(motorcyclesResult.error || "Error al cargar motocicletas");
    }

    if (!providersResult.success) {
      throw new Error(providersResult.error || "Error al cargar proveedores");
    }

    if (!transfersResult.success) {
      throw new Error(transfersResult.error || "Error al cargar transferencias");
    }

    return (
      <div className="min-h-screen bg-background">
        <LogisticClient
          initialMotorcycles={motorcyclesResult.motorcycles}
          logisticProviders={providersResult.providers}
          branches={branches}
          transfersInTransit={transfersResult.transfers}
        />
      </div>
    );
  } catch (error) {
    console.error("Error en página de logística:", error);
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Error al cargar la página</h1>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : "Ha ocurrido un error inesperado"}
            </p>
          </div>
        </div>
      </div>
    );
  }
}
