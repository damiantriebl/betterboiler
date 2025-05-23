"use server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { MotorcycleState, type Prisma } from "@prisma/client";

export async function getSales({ since }: { since?: string } = {}) {
  // Obtener la organización del usuario autenticado
  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.user?.organizationId;

  if (!organizationId) {
    console.error("getSales: Usuario no autenticado o sin organización.");
    return [];
  }

  const where: Prisma.MotorcycleWhereInput = {
    organizationId,
    state: MotorcycleState.VENDIDO,
  };
  if (since) {
    where.updatedAt = { gt: since };
  }

  return await prisma.motorcycle.findMany({
    where,
    orderBy: { updatedAt: "asc" },
    // Selecciona solo los campos que necesitas para la tabla de ventas
    select: {
      id: true,
      brand: { select: { name: true } },
      model: { select: { name: true } },
      year: true,
      soldAt: true,
      sellerId: true,
      clientId: true,
      retailPrice: true,
      // ...otros campos relevantes
      updatedAt: true,
    },
  });
}

export async function getAvailableMotorcycles() {
  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.user?.organizationId;

  if (!organizationId) {
    console.error("getAvailableMotorcycles: Usuario no autenticado o sin organización.");
    return [];
  }

  return await prisma.motorcycle.findMany({
    where: {
      organizationId,
      state: { in: [MotorcycleState.STOCK, MotorcycleState.PAUSADO] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      brand: { select: { name: true } },
      model: { select: { name: true } },
      year: true,
      retailPrice: true,
      // ...otros campos relevantes
      updatedAt: true,
    },
  });
}
