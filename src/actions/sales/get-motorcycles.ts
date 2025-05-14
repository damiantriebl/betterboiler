"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { type MotorcycleState, Prisma } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";

// Actualizar el tipo para incluir costPrice y wholesalePrice
export type MotorcycleTableRowData = {
  id: number;
  brand: {
    name: string;
    organizationBrands: {
      // Forzar a que sea un array (puede estar vacío)
      color: string | null;
    }[];
  } | null;
  model: {
    name: string;
    files?: {
      id: string;
      name: string;
      type: string;
      s3Key: string;
      s3KeySmall: string | null;
      size: number;
      createdAt: Date;
      updatedAt: Date;
    }[];
  } | null;
  color: { name: string; colorOne: string; colorTwo: string | null } | null;
  branch: { name: string } | null;
  supplier?: { legalName: string; commercialName: string | null } | null;
  year: number;
  displacement: number | null;
  mileage: number;
  retailPrice: number;
  wholesalePrice: number | null;
  costPrice: number | null;
  currency: string;
  state: MotorcycleState;
  chassisNumber: string;
  engineNumber: string | null;
  reservation?: {
    id: number;
    amount: number;
    clientId: string;
    status: string;
    paymentMethod?: string | null;
    notes?: string | null;
  } | null;
};

// Tipos para opciones de filtro
export interface GetMotorcyclesOptions {
  filter?: {
    state?: MotorcycleState[];
    // Añadir más filtros según sea necesario
  };
}

export async function getMotorcycles(
  options: GetMotorcyclesOptions = {},
): Promise<MotorcycleTableRowData[]> {
  noStore();
  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.user?.organizationId;

  if (!organizationId) {
    console.error("getMotorcycles: Usuario no autenticado o sin organización.");
    return [];
  }

  try {
    const motorcycles = await prisma.motorcycle.findMany({
      where: { organizationId: organizationId },
      select: {
        // Seleccionar explícitamente
        id: true,
        year: true,
        displacement: true,
        mileage: true,
        retailPrice: true,
        wholesalePrice: true,
        costPrice: true,
        currency: true,
        state: true,
        chassisNumber: true,
        engineNumber: true,
        brand: {
          select: {
            name: true,
            organizationBrands: {
              where: { organizationId: organizationId },
              select: { color: true },
            },
          },
        },
        model: {
          select: {
            name: true,
            files: {
              select: {
                id: true,
                name: true,
                type: true,
                s3Key: true,
                s3KeySmall: true,
                size: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
        color: { select: { name: true, colorOne: true, colorTwo: true } },
        branch: { select: { name: true } },
        supplier: { select: { legalName: true, commercialName: true } },
        // Cambiar "reservation" por "reservations" y obtener solo la reserva activa
        reservations: {
          select: {
            id: true,
            amount: true,
            clientId: true,
            status: true,
            paymentMethod: true,
            notes: true,
          },
          where: {
            status: "active",
          },
          take: 1, // Tomar solo la primera reserva activa
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Mapear cuidadosamente para asegurar el tipo final
    const formattedMotorcycles: MotorcycleTableRowData[] = motorcycles.map((moto) => {
      // Extraer el color de la marca de forma segura
      const brandColorData = moto.brand?.organizationBrands?.[0]; // Puede ser undefined

      // Construir el objeto brand para el tipo final
      const finalBrand = moto.brand
        ? {
            name: moto.brand.name,
            // Asegurar que organizationBrands sea un array, incluso si está vacío
            organizationBrands: moto.brand.organizationBrands || [],
          }
        : null;

      // Obtener la primera reserva activa (si existe)
      const activeReservation =
        moto.reservations && moto.reservations.length > 0 ? moto.reservations[0] : null;

      return {
        // Campos directos
        id: moto.id,
        year: moto.year,
        displacement: moto.displacement,
        mileage: moto.mileage,
        retailPrice: moto.retailPrice,
        wholesalePrice: moto.wholesalePrice,
        costPrice: moto.costPrice,
        currency: moto.currency,
        state: moto.state,
        chassisNumber: moto.chassisNumber,
        engineNumber: moto.engineNumber,
        // Relaciones (asegurando null si no existen)
        brand: finalBrand,
        model: moto.model
          ? {
              name: moto.model.name,
              files: moto.model.files || [],
            }
          : null,
        color: moto.color ?? null,
        branch: moto.branch ?? null,
        supplier: moto.supplier ?? undefined,
        // Usar la reserva activa extraída antes
        reservation: activeReservation,
      };
    });

    return formattedMotorcycles;
  } catch (error) {
    console.error("Error obteniendo motocicletas:", error);
    return [];
  }
}
