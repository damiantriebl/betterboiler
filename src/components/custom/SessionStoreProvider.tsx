"use client";

import type { OrganizationSessionData } from "@/actions/util/organization-session-unified";
import { useSessionStore } from "@/stores/SessionStore";
import { useEffect } from "react";

interface SessionStoreProviderProps {
  sessionData: OrganizationSessionData;
  children: React.ReactNode;
}

export default function SessionStoreProvider({ sessionData, children }: SessionStoreProviderProps) {
  const setSession = useSessionStore((state) => state.setSession);

  console.log(`🏪 [SESSION STORE] SessionStoreProvider renderizado:`, {
    hasSessionData: !!sessionData,
    hasUserId: !!sessionData?.userId,
    hasError: !!sessionData?.error,
    error: sessionData?.error,
    userId: sessionData?.userId,
    userEmail: sessionData?.userEmail,
    organizationId: sessionData?.organizationId
  });

  useEffect(() => {
    console.log(`🔄 [SESSION STORE] useEffect ejecutado con sessionData:`, {
      hasSessionData: !!sessionData,
      hasError: !!sessionData?.error,
      error: sessionData?.error,
      userId: sessionData?.userId
    });

    // Actualizar el store si tenemos sessionData Y (no hay error O el usuario está autenticado)
    // Esto permite que usuarios sin organización aún puedan estar "logueados"
    const shouldUpdateStore = sessionData && (!sessionData.error || sessionData.userId);

    if (shouldUpdateStore) {
      console.log(`✅ [SESSION STORE] Actualizando store con datos (usuario autenticado=${!!sessionData.userId})`);
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
      console.warn(`⚠️ [SESSION STORE] No se actualiza el store - sessionData inválido sin userId`);
    }
  }, [sessionData, setSession]);

  return <>{children}</>;
}
