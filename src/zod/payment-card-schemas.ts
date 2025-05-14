import { z } from "zod";

// Basic payment card schema
export const paymentCardSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre de la tarjeta no puede estar vacío.")
    .max(100, "El nombre de la tarjeta es demasiado largo."),
  type: z.enum(["credit", "debit"]).default("credit"),
  issuer: z
    .string()
    .min(1, "El emisor de la tarjeta no puede estar vacío.")
    .max(100, "El emisor de la tarjeta es demasiado largo."),
  logoUrl: z.string().url("El formato de la URL del logo es inválido.").optional().nullable(),
});

// Schema for toggling card availability in the organization
export const toggleCardSchema = z.object({
  cardId: z.number().int().positive("ID de tarjeta inválido"),
  isEnabled: z.boolean(),
});

// Schema for updating card order
export const cardOrderSchema = z.object({
  id: z.number().int().positive(),
  order: z.number().int().min(0),
});

export const updateCardsOrderSchema = z.array(cardOrderSchema);
