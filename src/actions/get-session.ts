"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";

export async function getSession() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    
    if (!session || !session.user) {
      console.log("❌ No session found");
      return null;
    }
    
    // Obtener datos de la organización si hay un organizationId
    let orgName = null;
    let orgLogo = null;
    
    if (session.user.organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: session.user.organizationId },
        select: { name: true, logo: true }
      });
      
      if (org) {
        orgName = org.name;
        orgLogo = org.logo;
      }
    }
    
    // Extraer los datos del usuario y la organización para el store
    return {
      // Datos de organización
      organizationId: session.user.organizationId || null,
      organizationName: orgName,
      organizationLogo: orgLogo,
      
      // Datos de usuario
      userId: session.user.id,
      userName: session.user.name || null,
      userEmail: session.user.email,
      userImage: session.user.profileOriginal || null,
      userRole: session.user.role,
    };
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (getSession):", error);
    return null;
  }
} 