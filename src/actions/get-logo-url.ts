'use server';

import { auth } from "@/auth";

// Definición de urlCache a nivel de módulo, específica para getLogoUrl
const urlCache = new Map<string, string>();

const GENERAL_ACCOUNT_ID_LOGO_URL = "GENERAL_ACCOUNT";

interface S3SignedUrlResponse {
  success?: {
    url: string;
  };
  error?: string;
  message?: string;
}

// Modificada para devolver null en caso de error en lugar de lanzar excepciones
export async function getLogoUrl(input: string): Promise<string | null> { // Devuelve string | null
  const session = await auth.api.getSession({
    headers: {
      // ... existing code ...
    }
  });

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
    
    let data: S3SignedUrlResponse;
    try {
      data = await res.json();
    } catch (e) {
      console.error("Error parsing JSON from S3 signed URL response:", e);
      return null;
    }

    if (data.success?.url) {
      urlCache.set(input, data.success.url);
      return data.success.url;
    }
    
    // Usar data.error o data.message si existen, en lugar de data.failure
    console.error(
      `Error fetching signed URL for ${input}: ${data.error || data.message || 'Unknown error from S3 API'}`,
    );
    return null;

  } catch (error) {
    // Este catch es para errores inesperados durante el fetch mismo (ej. red)
    console.error(`getLogoUrl: Error de fetch para input: ${input}:`, error);
    return null; // Devuelve null en caso de error de fetch
  }
} 