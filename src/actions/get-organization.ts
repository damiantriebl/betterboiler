"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";

// Helper para obtener organizationId (reutilizado)
async function getOrganizationIdFromSession(): Promise<string | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    console.log("🔍 DEBUG Session in helper:", {
      sessionExists: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      organizationId: session?.user?.organizationId,
    });
    return session?.user?.organizationId ?? null;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

export async function getOrganization() {
  try {
    const organizationId = await getOrganizationIdFromSession();

    if (!organizationId) {
      console.log("❌ No organizationId found in session");
      return null;
    }

    // Buscar en la base de datos
    console.log("🔍 Searching organization in database:", organizationId);
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    console.log("🔍 Organization from database:", organization);
    return organization;
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (getOrganization):", error);
    return null;
  }
}
