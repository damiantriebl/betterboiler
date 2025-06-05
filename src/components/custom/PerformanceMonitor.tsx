"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Activity, Clock, Zap } from "lucide-react";
import { useEffect, useState } from "react";

interface PerformanceStats {
  loadTime: number;
  lastInteraction: number;
  totalInteractions: number;
  slowOperations: number;
  averageResponseTime: number;
  lastUpdate: Date;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  showInProduction?: boolean;
  threshold?: number;
}

export function PerformanceMonitor({
  enabled = true,
  showInProduction = false,
  threshold = 1000,
}: PerformanceMonitorProps) {
  const [stats, setStats] = useState<PerformanceStats>({
    loadTime: 0,
    lastInteraction: 0,
    totalInteractions: 0,
    slowOperations: 0,
    averageResponseTime: 0,
    lastUpdate: new Date(),
  });

  const [isVisible, setIsVisible] = useState(false);

  // Solo mostrar en desarrollo o si está explícitamente habilitado para producción
  const shouldShow = enabled && (process.env.NODE_ENV === "development" || showInProduction);

  useEffect(() => {
    if (!shouldShow) return;

    const startTime = performance.now();

    // Monitorear tiempo de carga inicial
    const updateLoadTime = () => {
      const loadTime = Math.round(performance.now() - startTime);
      setStats((prev) => ({
        ...prev,
        loadTime,
        lastUpdate: new Date(),
      }));
    };

    // Usar requestIdleCallback para no interferir con el performance
    if ("requestIdleCallback" in window) {
      requestIdleCallback(updateLoadTime);
    } else {
      setTimeout(updateLoadTime, 0);
    }

    // Escuchar eventos de performance personalizados
    const handlePerformanceEvent = (event: CustomEvent) => {
      const { operationTime, operationName } = event.detail;
      const isSlow = operationTime > threshold;

      setStats((prev) => ({
        ...prev,
        lastInteraction: operationTime,
        totalInteractions: prev.totalInteractions + 1,
        slowOperations: isSlow ? prev.slowOperations + 1 : prev.slowOperations,
        averageResponseTime: Math.round(
          (prev.averageResponseTime * prev.totalInteractions + operationTime) /
            (prev.totalInteractions + 1),
        ),
        lastUpdate: new Date(),
      }));

      // Log en consola para debugging
      console.log(`[PERF] ${operationName}: ${operationTime}ms ${isSlow ? "⚠️ SLOW" : "✅"}`);
    };

    window.addEventListener("performance-metric" as any, handlePerformanceEvent);

    return () => {
      window.removeEventListener("performance-metric" as any, handlePerformanceEvent);
    };
  }, [shouldShow, threshold]);

  // Función global para reportar métricas de performance
  useEffect(() => {
    if (!shouldShow) return;

    // Crear función global para reportar métricas
    (window as any).reportPerformanceMetric = (operationName: string, operationTime: number) => {
      window.dispatchEvent(
        new CustomEvent("performance-metric", {
          detail: { operationName, operationTime },
        }),
      );
    };

    return () => {
      (window as any).reportPerformanceMetric = undefined;
    };
  }, [shouldShow]);

  if (!shouldShow) return null;

  const getPerformanceColor = (time: number) => {
    if (time < 500) return "text-green-600";
    if (time < 1000) return "text-yellow-600";
    return "text-red-600";
  };

  const getPerformanceBadgeColor = () => {
    const avgTime = stats.averageResponseTime;
    if (avgTime < 500) return "default";
    if (avgTime < 1000) return "secondary";
    return "destructive";
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <DropdownMenu open={isVisible} onOpenChange={setIsVisible}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="shadow-lg">
            <Activity className="h-4 w-4 mr-2" />
            <Badge variant={getPerformanceBadgeColor()}>{stats.averageResponseTime}ms</Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="p-3 space-y-2">
            <h4 className="font-semibold text-sm flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              Performance Monitor
            </h4>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Tiempo de carga:</span>
                <span className={getPerformanceColor(stats.loadTime)}>{stats.loadTime}ms</span>
              </div>

              <div className="flex justify-between">
                <span>Última interacción:</span>
                <span className={getPerformanceColor(stats.lastInteraction)}>
                  {stats.lastInteraction}ms
                </span>
              </div>

              <div className="flex justify-between">
                <span>Promedio respuesta:</span>
                <span className={getPerformanceColor(stats.averageResponseTime)}>
                  {stats.averageResponseTime}ms
                </span>
              </div>

              <div className="flex justify-between">
                <span>Total interacciones:</span>
                <span>{stats.totalInteractions}</span>
              </div>

              <div className="flex justify-between">
                <span>Operaciones lentas:</span>
                <span className={stats.slowOperations > 0 ? "text-red-600" : "text-green-600"}>
                  {stats.slowOperations}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                {stats.lastUpdate.toLocaleTimeString()}
              </div>
            </div>
          </div>

          <DropdownMenuItem
            onClick={() => {
              setStats({
                loadTime: 0,
                lastInteraction: 0,
                totalInteractions: 0,
                slowOperations: 0,
                averageResponseTime: 0,
                lastUpdate: new Date(),
              });
            }}
          >
            Reset estadísticas
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
