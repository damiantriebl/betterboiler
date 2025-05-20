"use server";

import prisma from "@/lib/prisma";
// Import the main getOrganizationIdFromSession function
import { getOrganizationIdFromSession } from "./get-Organization-Id-From-Session"; 

export async function getOrganization() {
  try {
    // Use the imported function
    const sessionResult = await getOrganizationIdFromSession();

    if (sessionResult.error || !sessionResult.organizationId) {
      console.log("❌ No organizationId found in session or error occurred:", sessionResult.error || "No organizationId");
      return null;
    }
    
    const { organizationId } = sessionResult;

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
