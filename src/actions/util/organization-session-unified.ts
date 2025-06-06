"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";

export interface OrganizationSessionData {
  organizationId: string | null;
  organizationName: string | null;
  organizationLogo: string | null;
  organizationThumbnail: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  userRole: string | null;
  error?: string;
}

// 🚀 CACHE EN MEMORIA para evitar consultas repetidas
interface UserImageCache {
  profileCrop: string | null;
  profileOriginal: string | null;
  timestamp: number;
}

interface OrganizationCache {
  id: string;
  name: string;
  logo: string | null;
  thumbnail: string | null;
  timestamp: number;
}

// Cache con TTL de 2 minutos (120000ms) - balance entre performance y actualización
const CACHE_TTL = 120000;
const userImageCache = new Map<string, UserImageCache>();
const organizationCache = new Map<string, OrganizationCache>();

// Función para limpiar cache expirado
function cleanExpiredCache() {
  const now = Date.now();
  let expiredUsers = 0;
  let expiredOrgs = 0;

  // Limpiar cache de usuarios
  for (const [userId, cache] of userImageCache.entries()) {
    if (now - cache.timestamp > CACHE_TTL) {
      userImageCache.delete(userId);
      expiredUsers++;
    }
  }

  // Limpiar cache de organizaciones
  for (const [orgId, cache] of organizationCache.entries()) {
    if (now - cache.timestamp > CACHE_TTL) {
      organizationCache.delete(orgId);
      expiredOrgs++;
    }
  }

  // Solo log en desarrollo
  if ((expiredUsers > 0 || expiredOrgs > 0) && process.env.NODE_ENV === "development") {
    console.log(
      `🧹 [CACHE CLEANUP] Removed ${expiredUsers} expired users, ${expiredOrgs} expired orgs`,
    );
  }
}

async function getUserImageWithLogic(
  userId: string,
  sessionImage: string | null,
): Promise<string | null> {
  try {
    // 🚀 VERIFICAR CACHE PRIMERO
    const cachedUser = userImageCache.get(userId);
    if (cachedUser && Date.now() - cachedUser.timestamp < CACHE_TTL) {
      // Aplicar la misma lógica de prioridad pero con datos en cache
      if (cachedUser.profileCrop) {
        return cachedUser.profileCrop;
      }

      if (cachedUser.profileOriginal) {
        return cachedUser.profileOriginal;
      }

      if (sessionImage) {
        return sessionImage;
      }

      return null;
    }

    // 🐌 CONSULTA A BD solo si no está en cache
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        profileOriginal: true,
        profileCrop: true,
      },
    });

    if (!user) {
      return sessionImage; // Fallback a imagen de sesión
    }

    // 🚀 GUARDAR EN CACHE
    userImageCache.set(userId, {
      profileCrop: user.profileCrop,
      profileOriginal: user.profileOriginal,
      timestamp: Date.now(),
    });

    // Orden de prioridad:
    // 1. user.profileCrop     // Imagen recortada personalizada
    // 2. user.profileOriginal // Imagen original personalizada
    // 3. session.user.image   // Imagen de Google OAuth
    // 4. null                 // Sin imagen
    if (user.profileCrop) {
      return user.profileCrop;
    }

    if (user.profileOriginal) {
      return user.profileOriginal;
    }

    // Si no tiene imagen personalizada, usar la de Google OAuth (si la hay)
    if (sessionImage) {
      return sessionImage;
    }

    return null;
  } catch (error) {
    // Solo log críticos en desarrollo
    if (process.env.NODE_ENV === "development") {
      console.error("💥 [USER IMAGE] Error determining user image:", error);
    }
    return sessionImage; // Fallback a imagen de sesión
  }
}

export async function getOrganizationSessionData(): Promise<OrganizationSessionData> {
  try {
    // 🧹 Limpiar cache expirado periódicamente
    cleanExpiredCache();

    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return {
        organizationId: null,
        organizationName: null,
        organizationLogo: null,
        organizationThumbnail: null,
        userId: null,
        userName: null,
        userEmail: null,
        userImage: null,
        userRole: null,
        error: "No se encontró la sesión del usuario",
      };
    }

    const user = session.user;

    // Determinar qué imagen usar con la lógica inteligente (con cache)
    const userImage = await getUserImageWithLogic(user.id, user.image || null);

    // Si no hay organizationId, devolver datos básicos del usuario
    if (!user.organizationId) {
      return {
        organizationId: null,
        organizationName: null,
        organizationLogo: null,
        organizationThumbnail: null,
        userId: user.id || null,
        userName: user.name || null,
        userEmail: user.email || null,
        userImage,
        userRole: user.role || null,
        error: "Usuario no tiene organización asignada",
      };
    }

    // 🚀 VERIFICAR CACHE DE ORGANIZACIÓN PRIMERO
    const cachedOrg = organizationCache.get(user.organizationId);
    if (cachedOrg && Date.now() - cachedOrg.timestamp < CACHE_TTL) {
      return {
        organizationId: cachedOrg.id,
        organizationName: cachedOrg.name,
        organizationLogo: cachedOrg.logo,
        organizationThumbnail: cachedOrg.thumbnail,
        userId: user.id || null,
        userName: user.name || null,
        userEmail: user.email || null,
        userImage,
        userRole: user.role || null,
      };
    }

    // 🐌 CONSULTA A BD solo si no está en cache
    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        id: true,
        name: true,
        logo: true,
        thumbnail: true,
      },
    });

    if (!organization) {
      return {
        organizationId: user.organizationId,
        organizationName: null,
        organizationLogo: null,
        organizationThumbnail: null,
        userId: user.id || null,
        userName: user.name || null,
        userEmail: user.email || null,
        userImage,
        userRole: user.role || null,
        error: "Organización no encontrada",
      };
    }

    // 🚀 GUARDAR EN CACHE
    organizationCache.set(user.organizationId, {
      id: organization.id,
      name: organization.name,
      logo: organization.logo,
      thumbnail: organization.thumbnail,
      timestamp: Date.now(),
    });

    return {
      organizationId: organization.id,
      organizationName: organization.name,
      organizationLogo: organization.logo,
      organizationThumbnail: organization.thumbnail,
      userId: user.id || null,
      userName: user.name || null,
      userEmail: user.email || null,
      userImage,
      userRole: user.role || null,
    };
  } catch (error) {
    // Solo log críticos en desarrollo
    if (process.env.NODE_ENV === "development") {
      console.error("💥 [SESSION] Error al obtener datos de organización y sesión:", error);
    }

    // Manejar diferentes tipos de errores de manera más específica
    let errorMessage = "Error interno desconocido";

    if (error instanceof Error) {
      if (error.message.includes("ENOTFOUND") || error.message.includes("ECONNREFUSED")) {
        errorMessage = "Error de conexión con la base de datos";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Timeout en la conexión";
      } else if (
        error.message.includes("unauthorized") ||
        error.message.includes("authentication")
      ) {
        errorMessage = "Error de autenticación";
      } else {
        errorMessage = error.message;
      }
    }

    return {
      organizationId: null,
      organizationName: null,
      organizationLogo: null,
      organizationThumbnail: null,
      userId: null,
      userName: null,
      userEmail: null,
      userImage: null,
      userRole: null,
      error: `Error interno: ${errorMessage}`,
    };
  }
}

// 🚀 FUNCIONES DE UTILIDAD PARA CACHE

/**
 * Invalida el cache de un usuario específico
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  userImageCache.delete(userId);
  console.log(`🧹 [CACHE] Invalidated user cache for: ${userId}`);
}

/**
 * Invalida el cache de una organización específica
 */
export async function invalidateOrganizationCache(organizationId: string): Promise<void> {
  organizationCache.delete(organizationId);
  console.log(`🧹 [CACHE] Invalidated organization cache for: ${organizationId}`);
}

/**
 * Limpia todo el cache
 */
export async function clearAllCache(): Promise<void> {
  userImageCache.clear();
  organizationCache.clear();
  console.log("🧹 [CACHE] Cleared all cache");
}

/**
 * Obtiene estadísticas del cache
 */
export async function getCacheStats(): Promise<{
  users: number;
  organizations: number;
  memory: string;
}> {
  const usersCount = userImageCache.size;
  const organizationsCount = organizationCache.size;

  // Estimación simple del uso de memoria
  const estimatedMemory = usersCount * 200 + organizationsCount * 150; // bytes aprox
  const memoryString =
    estimatedMemory > 1024
      ? `${(estimatedMemory / 1024).toFixed(2)} KB`
      : `${estimatedMemory} bytes`;

  return {
    users: usersCount,
    organizations: organizationsCount,
    memory: memoryString,
  };
}
