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

    console.log("✅ Found organizationId, userId, userEmail, userRole in session.user:", 
      session.user.organizationId, 
      session.user.id, 
      session.user.email,
      session.user.role
    );
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

// Modificada para devolver null en caso de error en lugar de lanzar excepciones
export async function getLogoUrl(input: string): Promise<string | null> { // Devuelve string | null
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
    const res = await fetch(`/api/s3/get-signed-url?name=${encodeURIComponent(input)}&operation=get`);
    
    let data;
    try {
      data = await res.json();
    } catch (e) {
      // Intentar leer el cuerpo como texto si el parseo JSON falla
      let textResponse = "";
      try {
        textResponse = await res.text();
      } catch (textError) {
        console.error(`getLogoUrl: Error al leer la respuesta como texto después de fallo de JSON (para input: ${input})`, textError);
      }
      console.error(`getLogoUrl: API /api/s3/get-signed-url (para input: ${input}) no devolvió JSON válido. Status: ${res.status}. Respuesta: ${textResponse.substring(0, 200)}...`);
      return null; // Devuelve null en caso de error de parseo JSON
    }

    if (res.ok && data && data.success?.url) {
      urlCache.set(input, data.success.url);
      return data.success.url;
    }
    
    // Si res no está ok, o data no tiene la estructura esperada.
    const errorMessage = data?.failure || `Fallo al obtener URL firmada (HTTP ${res.status})`;
    console.error(`getLogoUrl: Error tras llamar a API (para input: ${input}): ${errorMessage}`, data);
    return null; // Devuelve null si la API no fue exitosa o no devolvió la URL

  } catch (error) {
    // Este catch es para errores inesperados durante el fetch mismo (ej. red)
    console.error(`getLogoUrl: Error de fetch para input: ${input}:`, error);
    return null; // Devuelve null en caso de error de fetch
  }
}
