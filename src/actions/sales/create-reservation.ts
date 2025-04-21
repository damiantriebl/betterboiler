"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { MotorcycleState } from "@prisma/client";
import { getOrganizationIdFromSession } from "../getOrganizationIdFromSession";

// Esquema de validación para la creación de reservas
const reservationSchema = z.object({
  motorcycleId: z.number().positive(),
  clientId: z.string().min(1),
  amount: z.number().positive(),
  expirationDate: z.date().optional().nullable(),
  paymentMethod: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});

type ReservationInput = z.infer<typeof reservationSchema>;

export async function createReservation(data: ReservationInput) {
  try {
    // Validar los datos de entrada
    const validatedData = reservationSchema.parse(data);

    // Obtener el ID de la organización del usuario actual
    const organizationId = await getOrganizationIdFromSession();
    if (!organizationId) {
      return {
        success: false,
        error: "No se encontró una organización asociada a la sesión actual"
      };
    }

    // Iniciar una transacción para garantizar la consistencia
    const result = await prisma.$transaction(async (tx) => {
      // Verificar que la moto exista y pertenezca a la organización
      const motorcycle = await tx.motorcycle.findFirst({
        where: {
          id: validatedData.motorcycleId,
          organizationId
        }
      });

      if (!motorcycle) {
        throw new Error("No se encontró la motocicleta especificada");
      }

      // Verificar que la moto no esté ya reservada o vendida
      if (motorcycle.state !== MotorcycleState.STOCK && motorcycle.state !== MotorcycleState.PAUSADO) {
        throw new Error(`La motocicleta no está disponible para reserva (Estado actual: ${motorcycle.state})`);
      }

      // Verificar que el cliente exista
      const client = await tx.client.findUnique({
        where: { id: validatedData.clientId }
      });

      if (!client) {
        throw new Error("No se encontró el cliente especificado");
      }

      // Verificar si ya existe una reserva activa para esta moto
      const existingReservation = await tx.reservation.findFirst({
        where: {
          motorcycleId: validatedData.motorcycleId,
          status: "active"
        }
      });

      if (existingReservation) {
        // Esta moto ya tiene una reserva activa, pero ahora permitimos múltiples reservas
        // Solo para mostrar un mensaje informativo, pero continuamos con la creación
        console.log(`La moto ${validatedData.motorcycleId} ya tiene una reserva activa, pero se permite crear otra`);
      }

      // Crear la reserva
      const reservation = await tx.reservation.create({
        data: {
          amount: validatedData.amount,
          expirationDate: validatedData.expirationDate || null,
          notes: validatedData.notes,
          paymentMethod: validatedData.paymentMethod,
          status: "active",
          motorcycle: {
            connect: { id: validatedData.motorcycleId }
          },
          client: {
            connect: { id: validatedData.clientId }
          },
          organization: {
            connect: { id: organizationId }
          }
        }
      });

      // Actualizar el estado de la moto a RESERVADO
      await tx.motorcycle.update({
        where: { id: validatedData.motorcycleId },
        data: { state: MotorcycleState.RESERVADO }
      });

      return reservation;
    });

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error("Error al crear la reserva:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al crear la reserva"
    };
  }
} 