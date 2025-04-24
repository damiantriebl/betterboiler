"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { Prisma, type MotorcycleState } from "@prisma/client";
import { headers } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";

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
  model: { name: string } | null;
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
  reservation?: {
    id: number;
    amount: number;
    clientId: string;
    status: string;
  } | null;
};

// Replace empty interface with type alias, using Record<string, unknown>
type GetMotorcyclesOptions = Record<string, unknown>;

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
        brand: {
          // Incluir marca y su relación OrganizationBrand
          select: {
            name: true,
            organizationBrands: {
              // Incluir explícitamente la relación
              where: { organizationId: organizationId },
              select: { color: true },
              // No usar take: 1 aquí, traer el array (aunque debería ser de 1)
            },
          },
        },
        model: { select: { name: true } },
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
        // Relaciones (asegurando null si no existen)
        brand: finalBrand,
        model: moto.model ?? null,
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
