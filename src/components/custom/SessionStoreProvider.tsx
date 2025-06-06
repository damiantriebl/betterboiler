"use client";

import type { OrganizationSessionData } from "@/actions/util/organization-session-unified";
import { useSessionStore } from "@/stores/SessionStore";
import { useEffect } from "react";
import { isDevelopment } from "@/lib/env";

interface SessionStoreProviderProps {
  sessionData: OrganizationSessionData;
  children: React.ReactNode;
}

export default function SessionStoreProvider({ sessionData, children }: SessionStoreProviderProps) {
  const setSession = useSessionStore((state) => state.setSession);
  const clearSession = useSessionStore((state) => state.clearSession);
  const currentUserId = useSessionStore((state) => state.userId);

  // Solo log en desarrollo
  if (isDevelopment()) {
    console.log("🏪 [SESSION STORE] SessionStoreProvider renderizado:", {
      hasSessionData: !!sessionData,
      hasUserId: !!sessionData?.userId,
      hasError: !!sessionData?.error,
      error: sessionData?.error,
      userId: sessionData?.userId,
      userEmail: sessionData?.userEmail,
      organizationId: sessionData?.organizationId,
      currentStoreUserId: currentUserId,
    });
  }

  useEffect(() => {
    if (isDevelopment()) {
      console.log("🔄 [SESSION STORE] useEffect ejecutado con sessionData:", {
        hasSessionData: !!sessionData,
        hasError: !!sessionData?.error,
        error: sessionData?.error,
        userId: sessionData?.userId,
        currentStoreUserId: currentUserId,
      });
    }

    // Verificar inconsistencia: store tiene userId pero sessionData no
    const hasInconsistentState = currentUserId && !sessionData?.userId;

    if (hasInconsistentState) {
      if (isDevelopment()) {
        console.warn("🧹 [SESSION STORE] Estado inconsistente detectado - limpiando store corrupto");
        console.warn(`   Store tenía userId: ${currentUserId}`);
        console.warn(`   SessionData userId: ${sessionData?.userId || "null"}`);
      }
      clearSession();
      return;
    }

    // Actualizar el store si tenemos sessionData Y (no hay error O el usuario está autenticado)
    // Esto permite que usuarios sin organización aún puedan estar "logueados"
    const shouldUpdateStore = sessionData && (!sessionData.error || sessionData.userId);

    if (shouldUpdateStore) {
      if (isDevelopment()) {
        console.log(
          `✅ [SESSION STORE] Actualizando store con datos (usuario autenticado=${!!sessionData.userId})`,
        );
      }
      setSession({
        organizationId: sessionData.organizationId,
        organizationName: sessionData.organizationName,
        organizationLogo: sessionData.organizationLogo,
        userId: sessionData.userId,
        userName: sessionData.userName,
        userEmail: sessionData.userEmail,
        userImage: sessionData.userImage,
        userRole: sessionData.userRole,
      });
    } else {
      if (isDevelopment()) {
        console.warn("⚠️ [SESSION STORE] No se actualiza el store - sessionData inválido sin userId");
      }

      // Si no hay datos válidos y el store tiene datos, limpiar
      if (currentUserId) {
        if (isDevelopment()) {
          console.log("🧹 [SESSION STORE] Limpiando store porque no hay sessionData válido");
        }
        clearSession();
      }
    }
  }, [sessionData, setSession, clearSession, currentUserId]);

  return <>{children}</>;
}
