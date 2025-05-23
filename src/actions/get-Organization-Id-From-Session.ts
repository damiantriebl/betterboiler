"use server";

import { auth } from "@/auth";
import { headers } from "next/headers";

// Definición de urlCache a nivel de módulo
const urlCache = new Map<string, string>();

interface SessionResult {
  organizationId: string | null;
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  error?: string;
}

interface S3SignedUrlResponse {
  success?: {
    url: string;
  };
  error?: string;
  message?: string;
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

export async function getLogoUrl(input: string): Promise<string | null> {
  // Devuelve string | null
  if (!input) {
    console.error("getLogoUrl: No logo input provided");
    return null; // Devuelve null si no hay input
  }

  const cachedUrl = urlCache.get(input);
  if (cachedUrl) return cachedUrl;

  if (input.startsWith("http://") || input.startsWith("https://")) {
    urlCache.set(input, input);
    return input;
  }

  try {
    const res = await fetch(
      `/api/s3/get-signed-url?name=${encodeURIComponent(input)}&operation=get`,
    );

    let data: S3SignedUrlResponse;
    try {
      data = await res.json();
    } catch (e) {
      console.error(
        "Error parsing JSON from S3 signed URL response (getOrganizationIdFromSession):",
        e,
      );
      return null;
    }

    if (data.success?.url) {
      urlCache.set(input, data.success.url);
      return data.success.url;
    }
    console.error(
      `Error fetching signed URL for logo ${input} (getOrganizationIdFromSession): ${data.error || data.message || "Unknown error from S3 API"}`,
    );
    return null;
  } catch (error) {
    // Este catch es para errores inesperados durante el fetch mismo (ej. red)
    console.error(`getLogoUrl: Error de fetch para input: ${input}:`, error);
    return null; // Devuelve null en caso de error de fetch
  }
}
