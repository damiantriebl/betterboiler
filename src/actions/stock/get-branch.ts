"use server";

import { getOrganizationIdFromSession } from "../get-Organization-Id-From-Session";
import prisma from "@/lib/prisma";

// Tipo de retorno para las sucursales
export type BranchData = {
  id: number;
  nombre: string;
};

// Acción para obtener sucursales por organización
export async function getBranches(): Promise<BranchData[]> {
  const org = await getOrganizationIdFromSession();

  if (!org.organizationId) {
    console.error("[getBranches] No organizationId found.");
    return [];
  }

  const organizationId = org.organizationId;

  try {
    const branchesFromDb = await prisma.branch.findMany({
      where: { organizationId: organizationId },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    const branches: BranchData[] = branchesFromDb.map((branch) => ({
      id: branch.id,
      nombre: branch.name,
    }));

    return branches;
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (getBranches):", error);
    return [];
  }
}
