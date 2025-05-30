"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import type {
  Branch,
  Brand,
  Client,
  Model,
  ModelFile,
  MotoColor,
  Motorcycle,
  Reservation,
} from "@prisma/client";
import { headers } from "next/headers";

// Definimos el tipo correcto para la moto incluyendo relaciones
export type MotorcycleWithRelations = Motorcycle & {
  brand?: Brand | null;
  model?:
    | (Model & {
        files?: ModelFile[];
      })
    | null;
  branch?: Branch | null;
  color?: MotoColor | null;
  client?: Client | null;
  reservations?: (Reservation & { client: Client | null })[];
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
        organizationId: organizationId,
      },
      include: {
        brand: true,
        model: {
          include: {
            files: true,
          },
        },
        branch: true,
        color: true,
        client: true,
        reservations: {
          include: { client: true },
        },
      },
    });
    return motorcycle;
  } catch (error) {
    console.error("Error al obtener la moto:", error);
    return null;
  }
}
