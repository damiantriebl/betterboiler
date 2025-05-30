// --- CAMBIOS PARA CLIENTES ---

import { getClients } from "@/actions/clients/manage-clients";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import React, { Suspense } from "react";
import ClientComponent from "./ClientComponent";

// Componente de Loading optimizado para UX
function ClientsTableSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="h-5 w-96 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
      </div>
      <div className="space-y-4">
        <div className="h-64 bg-muted animate-pulse rounded" />
        <div className="flex justify-between">
          <div className="h-8 w-24 bg-muted animate-pulse rounded" />
          <div className="h-8 w-16 bg-muted animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
}

// Componente de Error con mejor UX
function ClientsError({ error }: { error: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error al cargar clientes</AlertTitle>
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

// Componente separado para datos async con error boundaries
async function ClientsContent() {
  try {
    // Llamar a la acción para obtener clientes reales
    const initialClientsData = await getClients();

    // Verificar que la respuesta sea válida
    if (!Array.isArray(initialClientsData)) {
      throw new Error("Error al obtener la lista de clientes");
    }

    return <ClientComponent initialData={initialClientsData} />;
  } catch (error) {
    console.error("Error cargando datos de clientes:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido al cargar clientes";
    return <ClientsError error={errorMessage} />;
  }
}

// Página principal optimizada con Suspense y metadata
export default async function ClientsPage() {
  return (
    <div className="container max-w-none p-4">
      <Suspense fallback={<ClientsTableSkeleton />}>
        <ClientsContent />
      </Suspense>
    </div>
  );
}
