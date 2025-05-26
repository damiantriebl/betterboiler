import { z } from "zod";

export const pettyCashDepositStatusEnum = z.enum(["OPEN", "CLOSED", "PENDING_FUNDING"]);

export const pettyCashWithdrawalStatusEnum = z.enum([
  "PENDING_JUSTIFICATION",
  "PARTIALLY_JUSTIFIED",
  "JUSTIFIED",
  "NOT_CLOSED",
]);

// --- Deposit Schemas ---
export const createPettyCashDepositSchema = z.object({
  amount: z.preprocess(
    (val) => (typeof val === "string" ? Number.parseFloat(val) : val),
    z
      .number({ invalid_type_error: "El monto debe ser un número." })
      .positive("El monto debe ser positivo."),
  ),
  date: z.preprocess(
    (arg) => {
      if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
    },
    z.date({
      required_error: "La fecha es requerida.",
      invalid_type_error: "Formato de fecha inválido.",
    }),
  ),
  description: z.string().min(1, "La descripción es requerida."),
  reference: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(), // branchId como string opcional (ID o GENERAL_ACCOUNT_VALUE)
});
export type CreatePettyCashDepositInput = z.infer<typeof createPettyCashDepositSchema>;

export const updatePettyCashDepositSchema = createPettyCashDepositSchema.extend({
  id: z.string().cuid(),
  status: pettyCashDepositStatusEnum.optional(), // Status podría ser actualizado por otras actions
});
export type UpdatePettyCashDepositInput = z.infer<typeof updatePettyCashDepositSchema>;

// --- Withdrawal Schemas ---
export const createPettyCashWithdrawalSchema = z.object({
  depositId: z.string().cuid("ID de depósito inválido.").optional(), // Opcional si la lógica busca un depósito activo
  userId: z.string().min(1, "El ID de usuario es requerido."),
  userName: z.string().min(1, "El nombre de usuario es requerido."),
  amountGiven: z.number().positive("El monto entregado debe ser positivo."),
  date: z.date(),
  description: z.string().optional(),
});
export type CreatePettyCashWithdrawalInput = z.infer<typeof createPettyCashWithdrawalSchema>;

export const updatePettyCashWithdrawalSchema = createPettyCashWithdrawalSchema
  .extend({
    id: z.string().cuid(),
    // amountJustified se actualiza por los gastos
    // status se actualiza por los gastos o al cerrar depósito
  })
  .omit({ depositId: true }); // No se puede cambiar el depósito de un retiro existente
export type UpdatePettyCashWithdrawalInput = z.infer<typeof updatePettyCashWithdrawalSchema>;

// --- Spend Schemas ---
export const createPettyCashSpendSchema = z.object({
  withdrawalId: z.string().cuid("ID de retiro inválido."),
  description: z.string().min(1, "La descripción es requerida.").max(255),
  amount: z.number().positive("El monto del gasto debe ser positivo."),
  date: z.date(),
  ticketUrl: z.string().url("URL de comprobante inválida.").optional().or(z.literal("")), // Acepta URL válida o string vacío
});
export type CreatePettyCashSpendInput = z.infer<typeof createPettyCashSpendSchema>;

export const updatePettyCashSpendSchema = createPettyCashSpendSchema
  .extend({
    id: z.string().cuid(),
  })
  .omit({ withdrawalId: true }); // No se puede cambiar el retiro de un gasto existente
export type UpdatePettyCashSpendInput = z.infer<typeof updatePettyCashSpendSchema>;

// --- Update Movement Schema (for general movement updates) ---
export const updatePettyCashMovementSchema = z.object({
  movementId: z.string().min(1, "El ID del movimiento es requerido."),
  amount: z.coerce
    .number({ invalid_type_error: "El monto debe ser un número." })
    .positive({ message: "El monto debe ser positivo." })
    .finite({ message: "El monto debe ser un número finito." }),
  description: z
    .string()
    .max(255, { message: "La descripción no puede exceder los 255 caracteres." })
    .optional()
    .nullable(),
  ticketNumber: z
    .string()
    .max(50, { message: "El número de ticket no puede exceder los 50 caracteres." })
    .optional()
    .nullable(),
  receiptUrl: z
    .string()
    .refine(
      (val) =>
        val === null || val === undefined || val === "" || z.string().url().safeParse(val).success,
      {
        message: "Debe ser una URL válida o estar vacío.",
      },
    )
    .optional()
    .nullable(),
});
export type UpdatePettyCashMovementInput = z.infer<typeof updatePettyCashMovementSchema>;
