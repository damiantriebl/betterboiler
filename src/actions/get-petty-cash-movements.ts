"use server";

import prisma from "@/lib/prisma";
import { getOrganizationIdFromSession } from "./getOrganizationIdFromSession";
import type { PettyCashMovement } from "@prisma/client";

export async function getPettyCashMovements(): Promise<{
  data?: PettyCashMovement[];
  error?: string;
}> {
  try {
    const sessionInfo = await getOrganizationIdFromSession();
    if (sessionInfo.error || !sessionInfo.organizationId) {
      return { error: sessionInfo.error || "Organization not found" };
    }
    const { organizationId } = sessionInfo;

    const movements = await prisma.pettyCashMovement.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        date: "desc",
      },
    });

    return { data: movements };
  } catch (error) {
    console.error("Error fetching petty cash movements:", error);
    return { error: "Failed to fetch petty cash movements" };
  }
} 