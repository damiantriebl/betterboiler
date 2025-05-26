"use client";

import { authClient } from "@/auth-client";
import type { Session } from "@/auth";
import { useEffect, useState, useRef } from "react";

// Cache global de sesión para evitar múltiples llamadas
let globalSessionCache: {
  session: Session | null;
  timestamp: number;
  promise?: Promise<Session | null>;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    const fetchSession = async () => {
      try {
        // Verificar cache primero
        const now = Date.now();
        if (globalSessionCache && (now - globalSessionCache.timestamp) < CACHE_DURATION) {
          if (isMounted.current) {
            setSession(globalSessionCache.session);
            setLoading(false);
          }
          return;
        }

        // Si ya hay una promesa en curso, esperarla
        if (globalSessionCache?.promise) {
          const cachedSession = await globalSessionCache.promise;
          if (isMounted.current) {
            setSession(cachedSession);
            setLoading(false);
          }
          return;
        }

        // Crear nueva promesa
        const sessionPromise = authClient.getSession().then(result => result.data);
        globalSessionCache = {
          session: null,
          timestamp: now,
          promise: sessionPromise,
        };

        const { data, error } = await authClient.getSession();
        
        // Actualizar cache
        globalSessionCache = {
          session: data,
          timestamp: now,
          promise: undefined,
        };

        if (isMounted.current) {
          if (error) {
            setError(new Error(error.message || "Error al obtener sesión"));
            setSession(null);
          } else {
            setSession(data);
            setError(null);
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted.current) {
          setError(err instanceof Error ? err : new Error("Error desconocido"));
          setSession(null);
          setLoading(false);
        }
      }
    };

    fetchSession();

    return () => {
      isMounted.current = false;
    };
  }, []);

  // Función para refrescar la sesión manualmente
  const refresh = async () => {
    globalSessionCache = null; // Limpiar cache
    setLoading(true);
    
    try {
      const { data, error } = await authClient.getSession();
      
      globalSessionCache = {
        session: data,
        timestamp: Date.now(),
      };
      
      if (error) {
        setError(new Error(error.message || "Error al refrescar sesión"));
        setSession(null);
      } else {
        setSession(data);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error desconocido"));
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  return { session, loading, error, refresh };
} 