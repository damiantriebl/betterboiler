"use server";

import prisma from "@/lib/prisma";
import type { Organization } from "@prisma/client";

export async function getOrganizationDetailsById(
  organizationId: string,
): Promise<Organization | null> {
  if (!organizationId) {
    console.error("getOrganizationDetailsById: No organizationId provided");
    return null;
  }

  try {
    const organization = await prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
    });
    return organization;
  } catch (error) {
    console.error(
      `Error fetching organization details for ID ${organizationId}:`,
      error,
    );
    return null;
  }
} 