"use server";

import { getOrganizationIdFromSession } from "../get-Organization-Id-From-Session";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client"; // Para tipos, si es necesario

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
  const org = await getOrganizationIdFromSession();

  if (!org.organizationId) {
    console.error("[getMotosEnProgreso] No organizationId found.");
    return []; // Devuelve vacío si no hay organización
  }

  const organizationId = org.organizationId;

  try {
    const motorcycles = await prisma.motorcycle.findMany({
      where: {
        organizationId: organizationId,
        state: "PROCESANDO",
      },
      include: {
        brand: {
          select: { name: true },
        },
        model: {
          select: { name: true },
        },
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
