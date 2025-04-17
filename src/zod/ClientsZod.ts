import { z } from "zod";

// Fiscal status and client type
const PersonType = z.enum(["Individual", "LegalEntity"]);
const ClientStatus = z.enum(["active", "inactive"]).default("active");

export const clientSchema = z.object({
  // Person type
  type: PersonType,

  // Basic data
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().optional(), // Solo para individuales
  companyName: z.string().optional(), // Solo para entidades legales
  taxId: z.string().min(8, "CUIT/CUIL es requerido"),

  // Contact
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),

  // Fiscal
  vatStatus: z.string().optional(),

  // Status
  status: ClientStatus,

  // Other optional fields
  notes: z.string().optional(),
});

export type ClientFormData = z.infer<typeof clientSchema>;
