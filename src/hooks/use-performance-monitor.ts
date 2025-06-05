"use client";

import { useEffect, useState } from "react";

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  interactionTime: number;
  lastUpdate: Date;
}

interface UsePerformanceMonitorOptions {
  enabled?: boolean;
  logToConsole?: boolean;
  threshold?: number; // Tiempo en ms para considerar una operación como lenta
}

export function usePerformanceMonitor(options: UsePerformanceMonitorOptions = {}) {
  const { enabled = true, logToConsole = true, threshold = 1000 } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    interactionTime: 0,
    lastUpdate: new Date(),
  });

  const [isSlowPerformance, setIsSlowPerformance] = useState(false);

  // Monitorear tiempo de carga inicial
  useEffect(() => {
    if (!enabled) return;

    const startTime = performance.now();

    const updateLoadTime = () => {
      const loadTime = Math.round(performance.now() - startTime);
      setMetrics((prev) => ({
        ...prev,
        loadTime,
        lastUpdate: new Date(),
      }));

      const isSlow = loadTime > threshold;
      setIsSlowPerformance(isSlow);

      if (logToConsole) {
        console.log(`[PERF] Load time: ${loadTime}ms ${isSlow ? "⚠️ SLOW" : "✅"}`);
      }
    };

    // Usar requestIdleCallback si está disponible, sino setTimeout
    if ("requestIdleCallback" in window) {
      requestIdleCallback(updateLoadTime);
    } else {
      setTimeout(updateLoadTime, 0);
    }
  }, [enabled, threshold, logToConsole]);

  // Función para medir tiempo de interacciones
  const measureInteraction = async <T>(
    operation: () => Promise<T> | T,
    operationName = "operation",
  ): Promise<T> => {
    const startTime = performance.now();

    try {
      const result = await operation();
      const interactionTime = Math.round(performance.now() - startTime);

      setMetrics((prev) => ({
        ...prev,
        interactionTime,
        lastUpdate: new Date(),
      }));

      const isSlow = interactionTime > threshold;

      if (logToConsole) {
        console.log(`[PERF] ${operationName}: ${interactionTime}ms ${isSlow ? "⚠️ SLOW" : "✅"}`);
      }

      return result;
    } catch (error) {
      const errorTime = Math.round(performance.now() - startTime);

      if (logToConsole) {
        console.error(`[PERF] ${operationName} failed after ${errorTime}ms:`, error);
      }

      throw error;
    }
  };

  // Función para marcar inicio de render
  const markRenderStart = () => {
    if (!enabled) return () => {};

    const startTime = performance.now();

    return () => {
      const renderTime = Math.round(performance.now() - startTime);
      setMetrics((prev) => ({
        ...prev,
        renderTime,
        lastUpdate: new Date(),
      }));

      if (logToConsole && renderTime > 100) {
        // Solo log renders lentos
        console.log(
          `[PERF] Render time: ${renderTime}ms ${renderTime > threshold ? "⚠️ SLOW" : "✅"}`,
        );
      }
    };
  };

  // Observer para Web Vitals si está disponible
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    // Monitorear LCP (Largest Contentful Paint)
    if ("PerformanceObserver" in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            if (entry.entryType === "largest-contentful-paint") {
              const lcp = Math.round(entry.startTime);
              if (logToConsole) {
                console.log(`[PERF] LCP: ${lcp}ms ${lcp > 2500 ? "⚠️ SLOW" : "✅"}`);
              }
            }
          }
        });

        observer.observe({ entryTypes: ["largest-contentful-paint"] });

        return () => observer.disconnect();
      } catch (error) {
        console.warn("[PERF] PerformanceObserver not supported or failed:", error);
      }
    }
  }, [enabled, logToConsole]);

  return {
    metrics,
    isSlowPerformance,
    measureInteraction,
    markRenderStart,
    enabled,
  };
}
