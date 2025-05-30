"use server";

import { auth } from "@/auth";
import type { Session } from "@/auth";
import { headers } from "next/headers";

// Types
export interface SessionResult {
  organizationId: string | null;
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  error?: string;
}

export interface FullSessionResult {
  session: any;
  error?: string;
}

export interface AuthValidationResult {
  success: boolean;
  organizationId?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  error?: string;
}

// Core authentication functions
export async function getSession(): Promise<FullSessionResult> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      console.error("❌ No session found.");
      return {
        session: null,
        error: "No se encontró la sesión.",
      };
    }

    return { session };
  } catch (error) {
    console.error("❌ Error in getSession:", error);
    return {
      session: null,
      error: `Error al obtener la sesión: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function getOrganizationIdFromSession(): Promise<SessionResult> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.organizationId) {
      console.error("❌ No organizationId found in session.user.organizationId");
      return {
        organizationId: null,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        userRole: session?.user?.role,
        error: "No se encontró el ID de la organización en la sesión.",
      };
    }

    if (!session.user.email) {
      console.error("❌ No email found in session.user.email");
      return {
        organizationId: session.user.organizationId,
        userId: session.user.id,
        userEmail: null,
        userRole: session.user.role,
        error: "No se encontró el email del usuario en la sesión.",
      };
    }

    if (!session.user.role) {
      console.error("❌ No role found in session.user.role");
      return {
        organizationId: session.user.organizationId,
        userId: session.user.id,
        userEmail: session.user.email,
        userRole: null,
        error: "No se encontró el rol del usuario en la sesión.",
      };
    }

    return {
      organizationId: session.user.organizationId,
      userId: session.user.id,
      userEmail: session.user.email,
      userRole: session.user.role,
    };
  } catch (error) {
    console.error("❌ Error in getOrganizationIdFromSession:", error);
    return {
      organizationId: null,
      userId: null,
      userEmail: null,
      userRole: null,
      error: `Error al obtener la sesión: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Validation helper
export async function validateOrganizationAccess(): Promise<AuthValidationResult> {
  const sessionResult = await getOrganizationIdFromSession();

  if (sessionResult.error || !sessionResult.organizationId) {
    return {
      success: false,
      error: sessionResult.error || "No se pudo obtener el ID de la organización",
    };
  }

  return {
    success: true,
    organizationId: sessionResult.organizationId,
    userId: sessionResult.userId || undefined,
    userEmail: sessionResult.userEmail || undefined,
    userRole: sessionResult.userRole || undefined,
  };
}

// Convenience functions
export async function requireOrganizationId(): Promise<string> {
  const result = await validateOrganizationAccess();
  if (!result.success || !result.organizationId) {
    throw new Error(result.error || "Organización no encontrada");
  }
  return result.organizationId;
}

export async function requireUserId(): Promise<string> {
  const result = await validateOrganizationAccess();
  if (!result.success || !result.userId) {
    throw new Error("Usuario no autenticado");
  }
  return result.userId;
}

export async function requireUserRole(): Promise<string> {
  const result = await validateOrganizationAccess();
  if (!result.success || !result.userRole) {
    throw new Error("Rol de usuario no encontrado");
  }
  return result.userRole;
}
