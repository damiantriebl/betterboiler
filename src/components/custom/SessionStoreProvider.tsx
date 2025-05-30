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

  useEffect(() => {
    // Solo actualizar el store si tenemos datos válidos
    if (sessionData && !sessionData.error) {
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
    }
  }, [sessionData, setSession]);

  return <>{children}</>;
}
