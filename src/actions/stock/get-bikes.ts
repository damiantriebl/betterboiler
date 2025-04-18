"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client"; // Para tipos, si es necesario

// Helper para obtener organizationId (reutilizado)
async function getOrganizationIdFromSession(): Promise<string | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user?.organizationId ?? null;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

// Tipo de datos para las motos en progreso que se pasarán al frontend
export type MotoEnProgresoData = {
  id: number;
  chassisNumber: string | null;
  brandName: string | null;
  modelName: string | null;
  // Añade otros campos que quieras mostrar
};

// Acción para obtener las motos en progreso
export async function getMotosEnProgreso(): Promise<MotoEnProgresoData[]> {
  const organizationId = await getOrganizationIdFromSession();

  if (!organizationId) {
    console.error("[getMotosEnProgreso] No organizationId found.");
    return []; // Devuelve vacío si no hay organización
  }

  try {
    const motorcycles = await prisma.motorcycle.findMany({
      where: {
        organizationId: organizationId,
        state: "IN_PROGRESS",
      },
      select: {
        id: true,
        chassisNumber: true,
        brand: {
          select: { name: true },
        },
        model: {
          select: { name: true },
        },
        // Selecciona otros campos si los necesitas
      },
      orderBy: {
        createdAt: "desc", // Mostrar las más recientes primero
      },
      take: 10, // Limitar la cantidad para no sobrecargar la UI
    });

    // Mapear al tipo esperado por el frontend
    const motosData: MotoEnProgresoData[] = motorcycles.map((motorcycle) => ({
      id: motorcycle.id,
      chassisNumber: motorcycle.chassisNumber ?? "N/A",
      brandName: motorcycle.brand?.name ?? "N/A",
      modelName: motorcycle.model?.name ?? "N/A",
    }));

    return motosData;
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (getMotosEnProgreso):", error);
    return []; // Devuelve vacío en caso de error
  }
}
