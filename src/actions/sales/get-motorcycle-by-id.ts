"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { Motorcycle, Brand, Model, Sucursal, MotoColor } from "@prisma/client";

// Definimos el tipo correcto para la moto incluyendo relaciones
export type MotorcycleWithRelations = Motorcycle & {
  brand?: Brand | null;
  model?: Model | null;
  branch?: Sucursal | null;
  color?: MotoColor | null;
};

export async function getMotorcycleById(id: string): Promise<MotorcycleWithRelations | null> {
  try {
    // Obtener la sesión del usuario
    const session = await auth.api.getSession({ headers: await headers() });
    const organizationId = session?.user?.organizationId;

    if (!organizationId) {
      console.error("getMotorcycleById: Usuario no autenticado o sin organización.");
      return null;
    }

    const motorcycle = await prisma.motorcycle.findUnique({
      where: { 
        id: Number(id),
        organizationId: organizationId
      },
      include: {
        brand: true,
        model: true,
        branch: true,
        color: true,
      }
    });
    return motorcycle;
  } catch (error) {
    console.error("Error al obtener la moto:", error);
    return null;
  }
} 