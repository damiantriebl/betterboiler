import { z } from "zod";

// Enum para el estado de la reserva
export const ReservationStatus = z.enum(["active", "completed", "cancelled", "expired"]);

// Esquema para la creación de reservas
export const createReservationSchema = z.object({
  motorcycleId: z.number().positive("El ID de la motocicleta debe ser un número positivo"),
  clientId: z.string().min(1, "El ID del cliente es requerido"),
  amount: z.number().positive("El monto debe ser un número positivo"),
  currency: z.enum(["USD", "ARS"]).default("USD"),
  expirationDate: z.date().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// Esquema para actualizar el estado de una reserva
export const updateReservationStatusSchema = z.object({
  reservationId: z.number().positive("El ID de la reserva debe ser un número positivo"),
  status: ReservationStatus,
});

// Tipo para la entrada de creación de reserva
export type CreateReservationInput = z.infer<typeof createReservationSchema>;

// Tipo para la actualización del estado de la reserva
export type UpdateReservationStatusInput = z.infer<typeof updateReservationStatusSchema>;
