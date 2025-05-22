"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";

// Helper para obtener organizationId (asumiendo que está disponible o puedes crearlo)
async function getOrganizationIdFromSession(): Promise<string | null> {
  // Implementación basada en tu helper existente en create-edit-brand.ts
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user?.organizationId ?? null;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

// Tipo de retorno para las sucursales
export type BranchData = {
  id: number;
  nombre: string;
};

// Acción para obtener sucursales por organización
export async function getBranchesForOrg(): Promise<{ data?: BranchData[]; error?: string }> {
  const organizationId = await getOrganizationIdFromSession();

  if (!organizationId) {
    return { error: "Usuario no autenticado o sin organización." };
  }

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

    return { data: branches };
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (getBranchesForOrg):", error);
    return { error: "Error al obtener las sucursales." };
  }
}
