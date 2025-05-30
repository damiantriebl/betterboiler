import { z } from "zod";

// Corresponds to the PaymentFrequency enum in Prisma
export const paymentFrequencySchema = z.enum([
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "ANNUALLY",
]);

// Corresponds to the CurrentAccountStatus enum in Prisma
export const currentAccountStatusSchema = z.enum([
  "ACTIVE",
  "PAID_OFF",
  "OVERDUE",
  "DEFAULTED",
  "CANCELLED",
]);

export const baseCurrentAccountObject = z.object({
  clientId: z.string().cuid({ message: "ID de cliente inválido." }),
  motorcycleId: z.number().int().positive({ message: "ID de motocicleta inválido." }),
  totalAmount: z
    .number({ required_error: "El monto total es requerido." })
    .positive({ message: "El monto total debe ser positivo." }),
  downPayment: z
    .number({ required_error: "El pago inicial es requerido." })
    .nonnegative({ message: "El pago inicial no puede ser negativo." }),
  numberOfInstallments: z
    .number({ required_error: "El número de cuotas es requerido." })
    .int()
    .positive({ message: "El número de cuotas debe ser un entero positivo." }),
  installmentAmount: z
    .number({ required_error: "El monto de la cuota es requerido." })
    .positive({ message: "El monto de la cuota debe ser positivo." }),
  paymentFrequency: paymentFrequencySchema,
  startDate: z
    .string({ required_error: "La fecha de inicio es requerida." })
    .datetime({ message: "Fecha de inicio inválida." }),
  reminderLeadTimeDays: z.number().int().optional(),
  status: currentAccountStatusSchema.default("ACTIVE").optional(),
  notes: z.string().optional(),
  organizationId: z
    .string({ required_error: "El ID de la organización es requerido." })
    .cuid({ message: "ID de organización inválido." }),
});

export const createCurrentAccountSchema = z
  .object({
    clientId: z.string().min(1, "El cliente es obligatorio."),
    motorcycleId: z.number().int().positive("La motocicleta es obligatoria."),
    organizationId: z.string().min(1, "La organización es obligatoria."),
    totalAmount: z.number().positive("El monto total debe ser positivo."),
    downPayment: z.number().min(0, "El pago inicial no puede ser negativo."),
    numberOfInstallments: z.number().int().positive("El número de cuotas debe ser positivo."),
    installmentAmount: z.number().positive("El monto de la cuota debe ser positivo."),
    paymentFrequency: paymentFrequencySchema,
    startDate: z.string().refine((date) => !Number.isNaN(Date.parse(date)), {
      message: "Fecha de inicio inválida.",
    }),
    interestRate: z.number().min(0, "La tasa de interés no puede ser negativa.").optional(),
    currency: z
      .string()
      .min(3, "La moneda debe tener al menos 3 caracteres (ej. ARS).")
      .max(3, "La moneda no puede tener más de 3 caracteres.")
      .optional(),
    reminderLeadTimeDays: z
      .number()
      .int()
      .min(0, "Los días de aviso no pueden ser negativos.")
      .optional(),
    status: currentAccountStatusSchema.optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.downPayment <= data.totalAmount, {
    message: "El pago inicial no puede ser mayor que el monto total.",
    path: ["downPayment"],
  });

export type CreateCurrentAccountInput = z.infer<typeof createCurrentAccountSchema>;

export const updateCurrentAccountSchema = z.object({
  id: z.string().cuid({ message: "ID de cuenta corriente inválido." }),
  paymentFrequency: paymentFrequencySchema.optional(),
  startDate: z.string().datetime({ message: "Fecha de inicio inválida." }).optional(),
  reminderLeadTimeDays: z.number().int().optional().nullable(),
  status: currentAccountStatusSchema.optional(),
  notes: z.string().optional().nullable(),
});

export type UpdateCurrentAccountInput = z.infer<typeof updateCurrentAccountSchema>;

export const recordPaymentSchema = z.object({
  currentAccountId: z.string().cuid({ message: "ID de cuenta corriente inválido." }),
  amountPaid: z
    .number({ required_error: "El monto pagado es requerido." })
    .positive({ message: "El monto pagado debe ser positivo." }),
  paymentDate: z
    .string({ required_error: "La fecha de pago es requerida." })
    .datetime({ message: "Fecha de pago inválida." })
    .optional(),
  paymentMethod: z.string().min(1, { message: "El método de pago es requerido." }).optional(),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
  isDownPayment: z.boolean().optional(),
  installmentNumber: z
    .number()
    .int()
    .positive("El número de cuota debe ser un entero positivo.")
    .optional(),
  surplusAction: z.enum(["RECALCULATE", "REDUCE_INSTALLMENTS"]).optional(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema> & {
  surplusAction?: "RECALCULATE" | "REDUCE_INSTALLMENTS";
};
