import { getCurrentAccounts, type CurrentAccountWithDetails } from "@/actions/current-accounts/get-current-accounts";
import { PlusCircle, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Suspense } from "react";
// Importar el componente de tabla
import CurrentAccountsTable from "./components/CurrentAccountsTable";

// Componente de carga
function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center py-12">
            <LoaderCircle className="h-10 w-10 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Cargando cuentas corrientes...</p>
        </div>
    );
}

// Componente que realiza la carga de datos
async function CurrentAccountsContent() {
    // Obtener los datos
    const result = await getCurrentAccounts({ page: 1, pageSize: 50 }); // Aumentamos el límite para ver todas las cuentas

    const accounts = result.success ? result.data : [];
    const totalCount = result.success ? result.totalCount : 0;

    return (
        <>
            {!result.success && result.error && (
                <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                    <span className="font-medium">Error:</span> {result.error}
                </div>
            )}

            {/* Aplicar el componente de tabla con los datos de cuentas corrientes */}
            {accounts && accounts.length > 0 ? (
                <div>
                    <p className="mb-4">Mostrando {accounts.length} de {totalCount} cuentas.</p>
                    <CurrentAccountsTable accounts={accounts} />
                    {/* TODO: Add pagination controls */}
                </div>
            ) : (
                <div className="text-center py-10">
                    <p className="text-gray-500">No se encontraron cuentas corrientes.</p>
                    {/* Optionally, provide a more prominent CTA to create one if list is empty and no error */}
                    {result.success && (
                        <Button variant="outline" className="mt-4" disabled> {/* Will enable later */}
                            <PlusCircle className="mr-2 h-5 w-5" />
                            Crear la Primera Cuenta
                        </Button>
                    )}
                </div>
            )}
        </>
    );
}

export default function CurrentAccountsPage() {
    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Cuentas Corrientes</h1>
            </div>

            <Suspense fallback={<LoadingState />}>
                <CurrentAccountsContent />
            </Suspense>
        </div>
    );
} 