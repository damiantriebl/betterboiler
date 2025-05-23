"use server";

import prisma from "@/lib/prisma";
import type { Branch } from "@prisma/client";

export async function getBranchesForOrganizationAction(organizationId: string): Promise<Branch[]> {
  if (!organizationId) {
    console.error("getBranchesForOrganizationAction: organizationId is required");
    return [];
  }
  try {
    const branches = await prisma.branch.findMany({
      where: { organizationId },
      orderBy: { order: "asc" },
    });
    return branches;
  } catch (error) {
    console.error("Error in getBranchesForOrganizationAction:", error);
    return [];
  }
}
