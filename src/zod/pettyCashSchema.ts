import { z } from 'zod';

export const PettyCashMovementBaseSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: 'El monto debe ser un número.' })
    .positive({ message: 'El monto debe ser positivo.' })
    .finite({ message: 'El monto debe ser un número finito.' }),
  description: z.string().max(255, { message: 'La descripción no puede exceder los 255 caracteres.' }).optional().nullable(),
  ticketNumber: z.string().max(50, { message: 'El número de ticket no puede exceder los 50 caracteres.' }).optional().nullable(),
  // branchIdContext: z.string({ required_error: 'Debe seleccionar una sucursal o caja general.' }), // No en update
  // organizationId: z.string(), // No en update
});

export const DepositPettyCashSchema = PettyCashMovementBaseSchema.extend({
  // Campos específicos para depósito si los hubiera en el futuro
});

export const WithdrawPettyCashSchema = PettyCashMovementBaseSchema.extend({
  // Campos específicos para retiro si los hubiera en el futuro
  assignedUserId: z.string({ required_error: "Debe seleccionar un usuario para el viático." }).min(1, "Debe seleccionar un usuario."),
});

export const SpendPettyCashSchema = PettyCashMovementBaseSchema.extend({
  // Campos específicos para gasto si los hubiera en el futuro
});

export const UpdatePettyCashMovementSchema = z.object({
  movementId: z.string(),
  amount: z.coerce
    .number({ invalid_type_error: 'El monto debe ser un número.' })
    .positive({ message: 'El monto debe ser positivo.' })
    .finite({ message: 'El monto debe ser un número finito.' }),
  description: z.string().max(255, { message: 'La descripción no puede exceder los 255 caracteres.' }).optional().nullable(),
  ticketNumber: z.string().max(50, { message: 'El número de ticket no puede exceder los 50 caracteres.' }).optional().nullable(),
  receiptUrl: z.string()
    .refine((val) => val === null || val === undefined || val === '' || z.string().url().safeParse(val).success, {
        message: "Debe ser una URL válida o estar vacío.",
    })
    .optional()
    .nullable(),
});

export type DepositPettyCashFormValues = z.infer<typeof DepositPettyCashSchema>;
export type WithdrawPettyCashFormValues = z.infer<typeof WithdrawPettyCashSchema>;
export type SpendPettyCashFormValues = z.infer<typeof SpendPettyCashSchema>;
export type UpdatePettyCashMovementFormValues = z.infer<typeof UpdatePettyCashMovementSchema>; 