"use client";

import { ProgressiveLoader } from "@/components/custom/ProgressiveLoader";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Tipos para los datos
interface DashboardData {
    brands?: any[];
    suppliers?: any[];
    branches?: any[];
    colors?: any[];
}

// Componentes skeleton para cada sección
function BrandsSkeleton() {
    return (
        <div className="space-y-2 p-4 border rounded-lg">
            <Skeleton className="h-6 w-32" />
            <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
            </div>
        </div>
    );
}

function SuppliersSkeleton() {
    return (
        <div className="space-y-2 p-4 border rounded-lg">
            <Skeleton className="h-6 w-32" />
            <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
            </div>
        </div>
    );
}

function BranchesSkeleton() {
    return (
        <div className="space-y-2 p-4 border rounded-lg">
            <Skeleton className="h-6 w-32" />
            <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
            </div>
        </div>
    );
}

// Componentes de contenido
function BrandsSection({ brands }: { brands: any[] }) {
    return (
        <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Marcas ({brands.length})</h3>
            {/* Tu componente de marcas aquí */}
        </div>
    );
}

function SuppliersSection({ suppliers }: { suppliers: any[] }) {
    return (
        <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Proveedores ({suppliers.length})</h3>
            {/* Tu componente de proveedores aquí */}
        </div>
    );
}

function BranchesSection({ branches }: { branches: any[] }) {
    return (
        <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Sucursales ({branches.length})</h3>
            {/* Tu componente de sucursales aquí */}
        </div>
    );
}

// Props del componente
interface StreamingDashboardProps {
    organizationId: string;
    // Funciones para cargar datos (deberías importarlas desde tus actions)
    loadBrands: () => Promise<any[]>;
    loadSuppliers: () => Promise<any[]>;
    loadBranches: () => Promise<any[]>;
    loadColors: () => Promise<any[]>;
}

export function StreamingDashboard({
    organizationId,
    loadBrands,
    loadSuppliers,
    loadBranches,
    loadColors,
}: StreamingDashboardProps) {
    return (
        <div className="space-y-6">
            {/* Título y header - Se muestra inmediatamente */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">
                    Vista general de tu organización
                </p>
            </div>

            {/* Grid de contenido con carga progresiva */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Marcas - Alta prioridad */}
                <ProgressiveLoader
                    loader={loadBrands}
                    cacheKey={`brands-${organizationId}`}
                    priority={1}
                    fallback={<BrandsSkeleton />}
                >
                    {(brands) => <BrandsSection brands={brands} />}
                </ProgressiveLoader>

                {/* Sucursales - Media prioridad */}
                <ProgressiveLoader
                    loader={loadBranches}
                    cacheKey={`branches-${organizationId}`}
                    priority={5}
                    fallback={<BranchesSkeleton />}
                >
                    {(branches) => <BranchesSection branches={branches} />}
                </ProgressiveLoader>

                {/* Proveedores - Baja prioridad */}
                <ProgressiveLoader
                    loader={loadSuppliers}
                    cacheKey={`suppliers-${organizationId}`}
                    priority={10}
                    fallback={<SuppliersSkeleton />}
                >
                    {(suppliers) => <SuppliersSection suppliers={suppliers} />}
                </ProgressiveLoader>
            </div>

            {/* Sección adicional que se carga después */}
            <div className="mt-8">
                <ProgressiveLoader
                    loader={loadColors}
                    cacheKey={`colors-${organizationId}`}
                    priority={15}
                    fallback={
                        <div className="h-32 bg-muted animate-pulse rounded-lg" />
                    }
                >
                    {(colors) => (
                        <div className="p-4 border rounded-lg">
                            <h3 className="font-semibold mb-2">
                                Colores disponibles ({colors.length})
                            </h3>
                            {/* Contenido de colores */}
                        </div>
                    )}
                </ProgressiveLoader>
            </div>
        </div>
    );
} 