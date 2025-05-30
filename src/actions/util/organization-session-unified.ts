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

export async function getOrganizationSessionData(): Promise<OrganizationSessionData> {
  try {
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
        userImage: user.image || null,
        userRole: user.role || null,
        error: "Usuario no tiene organización asignada",
      };
    }

    // Obtener información completa de la organización
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
        userImage: user.image || null,
        userRole: user.role || null,
        error: "Organización no encontrada",
      };
    }

    return {
      organizationId: organization.id,
      organizationName: organization.name,
      organizationLogo: organization.logo,
      organizationThumbnail: organization.thumbnail,
      userId: user.id || null,
      userName: user.name || null,
      userEmail: user.email || null,
      userImage: user.image || null,
      userRole: user.role || null,
    };
  } catch (error) {
    console.error("Error al obtener datos de organización y sesión:", error);
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
      error: `Error interno: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
