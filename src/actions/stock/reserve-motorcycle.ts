"use server";

import prisma from "@/lib/prisma";
import { MotorcycleState } from "@prisma/client";

export const reserveMotorcycle = async ({
  motorcycleId,
  reservationAmount,
  clientId,
}: {
  motorcycleId: number;
  reservationAmount: number;
  clientId: string;
}) => {
  try {
    const updated = await prisma.motorcycle.update({
      where: { id: motorcycleId },
      data: {
        state: MotorcycleState.RESERVADO,
        clientId,
      },
    });
    return { success: true, motorcycle: updated };
  } catch (error) {
    return { success: false, error: "No se pudo reservar la moto" };
  }
}; 