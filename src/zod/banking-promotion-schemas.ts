import type { BankingPromotionDisplay } from "@/types/banking-promotions";
import type { InstallmentPlan } from "@prisma/client";
import { z } from "zod";

// Define the day type
export const daySchema = z.enum([
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
]);

export type Day = z.infer<typeof daySchema>;

// Basic schema for installment plan
export const installmentPlanSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  installments: z
    .number()
    .int()
    .min(1, "Las cuotas deben ser al menos 1")
    .max(60, "Las cuotas no pueden ser más de 60"),
  interestRate: z
    .number()
    .min(0, "La tasa de interés no puede ser negativa")
    .max(100, "La tasa de interés no puede superar el 100%"),
  isEnabled: z.boolean().default(true),
});

// Schema for creating a banking promotion
export const bankingPromotionSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  description: z.string().optional().nullable(),
  paymentMethodId: z.union([z.number(), z.string().transform((val) => Number.parseInt(val))]).pipe(
    z.number({
      required_error: "Debe seleccionar un método de pago",
    }),
  ),
  bankCardId: z
    .union([z.number(), z.string().transform((val) => Number.parseInt(val)), z.literal("all")])
    .transform((val) => (val === "all" ? null : val))
    .nullable()
    .optional(),
  cardId: z
    .union([
      z.number(),
      z.string().transform((val) => Number.parseInt(val)),
      z.literal("all_cards"),
    ])
    .transform((val) => (val === "all_cards" ? null : val))
    .nullable()
    .optional(),
  bankId: z
    .union([
      z.number(),
      z.string().transform((val) => Number.parseInt(val)),
      z.literal("all_banks"),
    ])
    .transform((val) => (val === "all_banks" ? null : val))
    .nullable()
    .optional(),
  discountRate: z.number().min(0).max(100).nullable().optional(),
  surchargeRate: z.number().min(0).max(100).nullable().optional(),
  minAmount: z.number().min(0).nullable().optional(),
  maxAmount: z.number().min(0).nullable().optional(),
  isEnabled: z.boolean().default(true),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  activeDays: z.array(daySchema).optional().default([]),
  installmentPlans: z.array(installmentPlanSchema).optional().default([]),
});

// Schema for updating an existing promotion
export const updateBankingPromotionSchema = bankingPromotionSchema.extend({
  id: z.number(),
  organizationId: z.string(),
});

// Schema for updating installment plan status
export const updateInstallmentPlanStatusSchema = z.object({
  id: z.number(),
  isEnabled: z.boolean(),
});

// Schema for ordering promotions
export const orderPromotionsSchema = z.array(
  z.object({
    id: z.number(),
    order: z.number().min(0),
  }),
);

// Schema for promotion calculation
export const promotionCalculationSchema = z.object({
  amount: z.number().min(1),
  promotionId: z.number(),
  installments: z.number().optional(),
});
