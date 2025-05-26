"use client";

import { type ReactNode, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface ProgressiveLoaderProps<T> {
    // Función que carga los datos
    loader: () => Promise<T>;
    // Componente a renderizar cuando los datos están listos
    children: (data: T) => ReactNode;
    // Componente de loading (opcional)
    fallback?: ReactNode;
    // Key única para identificar este loader
    cacheKey?: string;
    // Tiempo de cache en ms (default: 5 minutos)
    cacheTime?: number;
    // Prioridad de carga (lower = higher priority)
    priority?: number;
    // Callback cuando se completa la carga
    onLoad?: (data: T) => void;
}

// Cache global para evitar recargas innecesarias
const dataCache = new Map<string, { data: any; timestamp: number }>();

// Cola de prioridad para cargas
const loadQueue: Array<{ load: () => void; priority: number }> = [];
let isProcessing = false;

// Procesar cola de carga
async function processQueue() {
    if (isProcessing || loadQueue.length === 0) return;

    isProcessing = true;

    // Ordenar por prioridad
    loadQueue.sort((a, b) => a.priority - b.priority);

    // Procesar en lotes
    const batch = loadQueue.splice(0, 3); // Máximo 3 cargas simultáneas

    await Promise.all(batch.map(item => item.load()));

    isProcessing = false;

    // Continuar con el siguiente lote
    if (loadQueue.length > 0) {
        setTimeout(processQueue, 50);
    }
}

export function ProgressiveLoader<T>({
    loader,
    children,
    fallback,
    cacheKey,
    cacheTime = 5 * 60 * 1000, // 5 minutos default
    priority = 10,
    onLoad,
}: ProgressiveLoaderProps<T>) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadData = async () => {
            try {
                // Verificar cache primero
                if (cacheKey) {
                    const cached = dataCache.get(cacheKey);
                    if (cached && Date.now() - cached.timestamp < cacheTime) {
                        setData(cached.data);
                        setLoading(false);
                        return;
                    }
                }

                // Ejecutar loader
                const result = await loader();

                if (!cancelled) {
                    setData(result);
                    setError(null);

                    // Guardar en cache
                    if (cacheKey) {
                        dataCache.set(cacheKey, { data: result, timestamp: Date.now() });
                    }

                    // Callback
                    onLoad?.(result);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err : new Error("Error loading data"));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        // Agregar a la cola con prioridad
        loadQueue.push({ load: loadData, priority });

        // Iniciar procesamiento
        setTimeout(processQueue, 0);

        return () => {
            cancelled = true;
        };
    }, [loader, cacheKey, cacheTime, priority, onLoad]);

    if (error) {
        return (
            <div className="text-destructive p-4 text-center">
                Error: {error.message}
            </div>
        );
    }

    if (loading) {
        return <>{fallback || <DefaultSkeleton />}</>;
    }

    return <>{data ? children(data) : null}</>;
}

// Skeleton por defecto
function DefaultSkeleton() {
    return (
        <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
        </div>
    );
}

// Hook para pre-calentar el cache
export function usePrefetch<T>(
    loader: () => Promise<T>,
    cacheKey: string,
    cacheTime = 5 * 60 * 1000
) {
    useEffect(() => {
        const prefetch = async () => {
            const cached = dataCache.get(cacheKey);
            if (!cached || Date.now() - cached.timestamp >= cacheTime) {
                try {
                    const data = await loader();
                    dataCache.set(cacheKey, { data, timestamp: Date.now() });
                } catch (error) {
                    console.error("Prefetch error:", error);
                }
            }
        };

        // Prefetch después de que la UI inicial se haya cargado
        const timer = setTimeout(prefetch, 1000);

        return () => clearTimeout(timer);
    }, [loader, cacheKey, cacheTime]);
} 