"use client";

import { isDevelopment } from "@/lib/env";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface SessionErrorHandlerOptions {
  error?: string | null;
  onSessionError?: (error: string) => void;
  redirectOnError?: boolean;
  redirectUrl?: string;
  maxRetries?: number;
  retryDelay?: number;
}

export function useSessionErrorHandler({
  error: externalError,
  onSessionError,
  redirectOnError = false,
  redirectUrl = "/sign-in",
  maxRetries = 1,
  retryDelay = 2000,
}: SessionErrorHandlerOptions = {}) {
  const router = useRouter();
  const retriesRef = useRef(0);
  const lastErrorRef = useRef<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Detectar cuando el componente está montado
  useEffect(() => {
    setIsMounted(true);
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Solo procesar si está montado e inicializado
    if (!isMounted || !isInitialized) {
      return;
    }

    if (externalError) {
      // Evitar procesar el mismo error múltiples veces
      if (lastErrorRef.current === externalError) {
        return;
      }

      lastErrorRef.current = externalError;

      // Solo log en desarrollo
      if (isDevelopment()) {
        console.log(`🚨 [SESSION ERROR HANDLER] Error detectado: ${externalError}`);
      }

      // Llamar al callback personalizado si existe
      if (onSessionError) {
        onSessionError(externalError);
      }

      // Manejo específico solo para errores críticos
      if (externalError.startsWith("Error interno:")) {
        if (isDevelopment()) {
          console.error("💥 [SESSION ERROR HANDLER] Error interno del sistema");
        }

        if (redirectOnError && retriesRef.current < maxRetries) {
          retriesRef.current++;
          setTimeout(() => {
            router.push(`${redirectUrl}?error=internal-error`);
          }, retryDelay);
        }
      }
    } else {
      // Reset cuando no hay error
      lastErrorRef.current = null;
      retriesRef.current = 0;
    }
  }, [
    externalError,
    isMounted,
    isInitialized,
    onSessionError,
    redirectOnError,
    redirectUrl,
    maxRetries,
    retryDelay,
    router,
  ]);

  return {
    error: externalError,
    hasError: !!externalError,
    isSessionError: externalError === "No se encontró la sesión del usuario",
    isOrganizationError: externalError === "Usuario no tiene organización asignada",
    isInternalError: externalError?.startsWith("Error interno:"),
    retries: retriesRef.current,
    maxRetries,
  };
}
