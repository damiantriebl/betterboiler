import { getMotorcycles, type MotorcycleTableRowData } from "@/actions/sales/get-motorcycles";
import { getClients } from "@/actions/clients/manage-clients";
import { getOrganizationBankingPromotions } from "@/actions/banking-promotions/get-banking-promotions";
import MotorcycleTable from "@/app/(app)/sales/(table)/MotorcycleTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { auth } from "@/auth";
import { Plus, AlertCircle } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";
import { Suspense } from "react";
import type { Client } from "@prisma/client";
import type { BankingPromotionDisplay } from "@/types/banking-promotions";
import type { MotorcycleWithFullDetails } from "@/types/motorcycle";

// Componente de Loading optimizado para UX
function StockTableSkeleton() {
    return (
        <div className="space-y-4">
            <div className="h-10 bg-muted animate-pulse rounded" />
            <div className="h-64 bg-muted animate-pulse rounded" />
            <div className="flex justify-between">
                <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </div>
        </div>
    );
}

// Componente de Error con mejor UX
function StockError({ error }: { error: string }) {
    return (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error al cargar el inventario</AlertTitle>
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

// Componente separado para la tabla con datos async y error boundaries
async function StockTableContent() {
    try {
        // Obtener session para organizationId
        const session = await auth.api.getSession({ headers: await headers() });
        const organizationId = session?.user?.organizationId;

        if (!organizationId) {
            throw new Error("No se pudo obtener la organización del usuario");
        }

        // Optimización: Cargar datos en paralelo con Promise.all
        const [motorcycles, clients, bankingPromotions] = await Promise.all([
            getMotorcycles(),
            getClients(),
            getOrganizationBankingPromotions(organizationId),
        ]);

        // Type assertion correcta para compatibilidad
        const motorcycleData = motorcycles as unknown as MotorcycleWithFullDetails[];

        return (
            <MotorcycleTable
                initialData={motorcycleData}
                clients={clients as Client[]}
                activePromotions={bankingPromotions as BankingPromotionDisplay[]}
            />
        );
    } catch (error) {
        console.error("Error cargando datos del stock:", error);
        const errorMessage =
            error instanceof Error ? error.message : "Error desconocido al cargar datos";
        return <StockError error={errorMessage} />;
    }
}

// Componente principal optimizado con responsive design y performance
export default async function StockPage() {
    return (
        <div className="container mx-auto p-4 space-y-6">
            {/* Header responsivo y optimizado */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Stock</h1>
                    <p className="text-muted-foreground">
                        Administra el inventario de motocicletas de forma eficiente
                    </p>
                </div>
                <Link href="/stock/new" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full sm:w-auto">
                        <Plus className="mr-2 h-5 w-5" />
                        Nueva Motocicleta
                    </Button>
                </Link>
            </div>

            {/* Card principal con contenido async y loading states */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        Inventario de Motocicletas
                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<StockTableSkeleton />}>
                        <StockTableContent />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    );
}
