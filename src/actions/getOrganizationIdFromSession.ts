"use server";

import { auth } from "@/auth";
import { headers } from "next/headers";

interface SessionResult {
  organizationId: string | null;
  userId?: string | null;
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
    });

    if (!session?.user?.organizationId) {
      console.error("❌ No organizationId found in session.user.organizationId");
      return {
        organizationId: null,
        userId: session?.user?.id,
        error: "No se encontró el ID de la organización en la sesión.",
      };
    }

    console.log("✅ Found organizationId in session.user:", session.user.organizationId);
    return { organizationId: session.user.organizationId, userId: session.user.id };
  } catch (error) {
    console.error("❌ Error in getOrganizationIdFromSession:", error);
    return {
      organizationId: null,
      error:
        "Error al obtener la sesión: " + (error instanceof Error ? error.message : String(error)),
    };
  }
}
