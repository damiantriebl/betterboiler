import { COVERAGE_ZONES, TRANSPORT_TYPES, VEHICLE_TYPES } from "@/types/logistics";
import { z } from "zod";

// Schema para LogisticProvider
export const logisticProviderSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  transportTypes: z
    .array(z.enum(TRANSPORT_TYPES))
    .min(1, "Debe seleccionar al menos un tipo de transporte"),
  vehicleTypes: z
    .array(z.enum(VEHICLE_TYPES))
    .min(1, "Debe seleccionar al menos un tipo de vehículo"),
  coverageZones: z
    .array(z.enum(COVERAGE_ZONES))
    .min(1, "Debe seleccionar al menos una zona de cobertura"),
  pricePerKm: z.coerce
    .number()
    .positive("El precio por km debe ser positivo")
    .optional()
    .nullable(),
  baseFee: z.coerce.number().positive("La tarifa base debe ser positiva").optional().nullable(),
  currency: z.string().default("ARS"),
  insurance: z.boolean().default(false),
  maxWeight: z.coerce.number().positive("El peso máximo debe ser positivo").optional().nullable(),
  maxVolume: z.coerce
    .number()
    .positive("El volumen máximo debe ser positivo")
    .optional()
    .nullable(),
  specialRequirements: z.string().optional(),
  rating: z.coerce.number().min(1).max(5).optional().nullable(),
  status: z.enum(["activo", "inactivo"]).default("activo"),
  notes: z.string().optional(),
});

// Schema para MotorcycleTransfer
export const motorcycleTransferSchema = z
  .object({
    motorcycleId: z.coerce.number().int().positive("Debe seleccionar una motocicleta"),
    fromBranchId: z.coerce.number().int().positive("Debe seleccionar la sucursal de origen"),
    toBranchId: z.coerce.number().int().positive("Debe seleccionar la sucursal de destino"),
    logisticProviderId: z.coerce.number().int().positive().optional(),
    scheduledPickupDate: z.date().optional().nullable(),
    notes: z.string().optional(),
  })
  .refine((data) => data.fromBranchId !== data.toBranchId, {
    message: "La sucursal de origen no puede ser la misma que la de destino",
    path: ["toBranchId"],
  });

// Schema para el formulario de transferencia (sin motorcycleId)
export const motorcycleTransferFormSchema = z
  .object({
    fromBranchId: z.coerce.number().int().positive("Debe seleccionar la sucursal de origen"),
    toBranchId: z.coerce.number().int().positive("Debe seleccionar la sucursal de destino"),
    logisticProviderId: z.coerce.number().int().positive().optional(),
    scheduledPickupDate: z.date().optional().nullable(),
    notes: z.string().optional(),
  })
  .refine((data) => data.fromBranchId !== data.toBranchId, {
    message: "La sucursal de origen no puede ser la misma que la de destino",
    path: ["toBranchId"],
  });

// Schema para actualizar el estado de una transferencia
export const updateTransferStatusSchema = z.object({
  status: z.enum(["REQUESTED", "CONFIRMED", "IN_TRANSIT", "DELIVERED", "CANCELLED"]),
  actualPickupDate: z.date().optional().nullable(),
  actualDeliveryDate: z.date().optional().nullable(),
  estimatedDeliveryDate: z.date().optional().nullable(),
  cost: z.coerce.number().positive().optional().nullable(),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
});

// Schema para filtros de transferencias
export const transferFiltersSchema = z.object({
  status: z
    .array(z.enum(["REQUESTED", "CONFIRMED", "IN_TRANSIT", "DELIVERED", "CANCELLED"]))
    .optional(),
  fromBranchId: z.coerce.number().int().positive().optional(),
  toBranchId: z.coerce.number().int().positive().optional(),
  logisticProviderId: z.coerce.number().int().positive().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
});

// Tipos TypeScript derivados de los esquemas
export type LogisticProviderFormData = z.infer<typeof logisticProviderSchema>;
export type MotorcycleTransferFormData = z.infer<typeof motorcycleTransferSchema>;
export type MotorcycleTransferFormOnlyData = z.infer<typeof motorcycleTransferFormSchema>;
export type UpdateTransferStatusFormData = z.infer<typeof updateTransferStatusSchema>;
export type TransferFiltersFormData = z.infer<typeof transferFiltersSchema>;
