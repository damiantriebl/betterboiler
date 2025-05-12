import { z } from "zod";

// Schema for toggling a payment method's enabled status
export const toggleMethodSchema = z.object({
  methodId: z.number({ required_error: "ID del método de pago es requerido" }),
  isEnabled: z.boolean({ required_error: "Estado es requerido" })
});

// Schema for ordering payment methods
export const orderMethodsSchema = z.array(
  z.object({
    id: z.number(),
    order: z.number().min(0)
  })
); 