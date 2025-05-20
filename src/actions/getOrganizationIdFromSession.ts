"use server";

import { auth } from "@/auth";
import { headers } from "next/headers";

interface SessionResult {
  organizationId: string | null;
  userId?: string | null;
  userRole?: string | null;
  error?: string;
}

export async function getOrganizationIdFromSession(): Promise<SessionResult> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    // Original-style logging, focused on user.organizationId
    console.log("🔍 DEBUG Session in getOrganizationIdFromSession:", {
      sessionExists: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userOrganizationId: session?.user?.organizationId,
      userRole: session?.user?.role,
    });

    if (!session?.user?.id || !session?.user?.organizationId) {
      console.error("❌ No userId or organizationId found in session.");
      return {
        organizationId: session?.user?.organizationId || null,
        userId: session?.user?.id || null,
        userRole: session?.user?.role || null,
        error: "No se encontró el ID de usuario o de organización en la sesión.",
      };
    }

    console.log("✅ Found organizationId in session.user:", session.user.organizationId);
    return {
      organizationId: session.user.organizationId,
      userId: session.user.id,
      userRole: session.user.role || null,
    };
  } catch (error) {
    console.error("❌ Error in getOrganizationIdFromSession:", error);
    return {
      organizationId: null,
      error: `Error al obtener la sesión: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
