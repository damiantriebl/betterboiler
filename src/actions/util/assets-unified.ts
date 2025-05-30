"use server";

import prisma from "@/lib/prisma";
import { getOrganizationIdFromSession } from "./auth-session-unified";

// Types
interface S3SignedUrlResponse {
  success?: {
    url: string;
  };
  error?: string;
  message?: string;
}

export interface AssetResult {
  success: boolean;
  url?: string;
  error?: string;
}

// Cache management
const urlCache = new Map<string, string>();

// Helper functions
function isValidUrl(input: string): boolean {
  return input.startsWith("http://") || input.startsWith("https://");
}

async function fetchSignedUrl(input: string): Promise<string | null> {
  try {
    // Construir URL absoluta para el servidor
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const url = `${baseUrl}/api/s3/get-signed-url?name=${encodeURIComponent(input)}&operation=get`;

    const res = await fetch(url);

    let data: S3SignedUrlResponse;
    try {
      data = await res.json();
    } catch (e) {
      console.error("Error parsing JSON from S3 signed URL response:", e);
      return null;
    }

    if (data.success?.url) {
      return data.success.url;
    }

    console.error(
      `Error fetching signed URL for ${input}: ${data.error || data.message || "Unknown error from S3 API"}`,
    );
    return null;
  } catch (error) {
    console.error(`fetchSignedUrl: Error de fetch para input: ${input}:`, error);
    return null;
  }
}

// Core asset functions
export async function getLogoUrl(input: string): Promise<string | null> {
  if (!input) {
    console.error("getLogoUrl: No logo input provided");
    return null;
  }

  // Check cache first
  const cachedUrl = urlCache.get(input);
  if (cachedUrl) return cachedUrl;

  // If it's already a valid URL, cache and return it
  if (isValidUrl(input)) {
    urlCache.set(input, input);
    return input;
  }

  // Fetch signed URL from S3
  const signedUrl = await fetchSignedUrl(input);
  if (signedUrl) {
    urlCache.set(input, signedUrl);
    return signedUrl;
  }

  return null;
}

export async function getLogoUrlFromOrganization(): Promise<string | null> {
  const organizationResult = await getOrganizationIdFromSession();

  if (!organizationResult.organizationId) {
    console.error("No se pudo obtener el ID de la organización");
    return null;
  }

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationResult.organizationId },
      select: { logo: true },
    });

    if (!organization?.logo) {
      return null;
    }

    return await getLogoUrl(organization.logo);
  } catch (error) {
    console.error("Error al obtener el logo de la organización:", error);
    return null;
  }
}

export async function fetchImageAsBase64(pathOrUrl: string): Promise<string> {
  const signedUrl = await getLogoUrl(pathOrUrl);

  if (!signedUrl) {
    throw new Error("No se pudo obtener la URL de la imagen");
  }

  const res = await fetch(signedUrl);

  if (!res.ok) {
    throw new Error("No se pudo obtener la imagen");
  }

  const contentType = res.headers.get("content-type") ?? "image/png";
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  console.log("base64", base64);
  return `data:${contentType};base64,${base64}`;
}

// Cache management functions
export async function clearAssetCache(): Promise<void> {
  urlCache.clear();
  console.log("Asset cache cleared");
}

export async function getAssetCacheSize(): Promise<number> {
  return urlCache.size;
}

export async function removeFromAssetCache(key: string): Promise<boolean> {
  return urlCache.delete(key);
}

// Utility functions
export async function getAssetWithFallback(
  primaryPath: string,
  fallbackPath?: string,
): Promise<AssetResult> {
  try {
    const url = await getLogoUrl(primaryPath);
    if (url) {
      return { success: true, url };
    }

    if (fallbackPath) {
      const fallbackUrl = await getLogoUrl(fallbackPath);
      if (fallbackUrl) {
        return { success: true, url: fallbackUrl };
      }
    }

    return {
      success: false,
      error: "No se pudo obtener la imagen principal ni la de respaldo",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

export async function preloadAssets(paths: string[]): Promise<void> {
  const promises = paths.map((path) => getLogoUrl(path));
  await Promise.allSettled(promises);
  console.log(`Preloaded ${paths.length} assets`);
}
