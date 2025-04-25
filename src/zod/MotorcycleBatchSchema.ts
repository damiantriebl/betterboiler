import { z } from "zod";
import { MotorcycleState } from "@prisma/client";

// Esquema para una sola unidad de identificación
export const unitIdentificationSchema = z.object({
  idTemporal: z.number().optional(), // ID temporal para react-hook-form, no va a DB
  chassisNumber: z.string().min(1, "El número de chasis es obligatorio."),
  engineNumber: z.string().nullable().optional(),
  colorId: z.number({ required_error: "Debe seleccionar un color." }).min(1, "Debe seleccionar un color."),
  mileage: z.number().min(0, "El kilometraje no puede ser negativo.").default(0),
  branchId: z.number({ required_error: "Debe seleccionar una sucursal." }).min(1, "Debe seleccionar una sucursal."),
  state: z.nativeEnum(MotorcycleState).default(MotorcycleState.STOCK),
  licensePlate: z.string().nullable().optional(),
  observations: z.string().nullable().optional(),
});

// Esquema principal para el lote/formulario completo
export const motorcycleBatchSchema = z.object({
  // Producto
  brandId: z.number({ required_error: "Debe seleccionar una marca." }).min(1, "Debe seleccionar una marca."),
  modelId: z.number({ required_error: "Debe seleccionar un modelo." }).min(1, "Debe seleccionar un modelo."),
  year: z.number({
    required_error: "El año es obligatorio.",
    invalid_type_error: "El año debe ser un número.",
  }).min(1900, "El año parece muy antiguo.").max(new Date().getFullYear() + 1, "El año no puede ser futuro."),
  displacement: z.number({
    invalid_type_error: "La cilindrada debe ser un número.",
  }).positive("La cilindrada debe ser positiva.").nullable().optional(),
  
  // Unidades (array de identificación)
  units: z.array(unitIdentificationSchema).min(1, "Debe añadir al menos una unidad."),

  // Precios
  currency: z.string().default("ARS"),
  costPrice: z.number({
    invalid_type_error: "El precio de costo debe ser un número.",
  }).positive("El precio de costo debe ser positivo.").nullable().optional(),
  wholesalePrice: z.number({
    invalid_type_error: "El precio mayorista debe ser un número.",
  }).positive("El precio mayorista debe ser positivo.").nullable().optional(),
  retailPrice: z.number({
    required_error: "El precio minorista es obligatorio.",
    invalid_type_error: "El precio minorista debe ser un número.",
  }).positive("El precio minorista debe ser positivo."),
  // Campos calculados (opcionales en el schema base, la lógica está en el form)
  ivaPorcentajeMinorista: z.number().nullable().optional(),
  otrosImpuestosMinorista: z.number().nullable().optional(),
  gananciaPorcentajeMinorista: z.number().nullable().optional(),
  ivaPorcentajeMayorista: z.number().nullable().optional(),
  otrosImpuestosMayorista: z.number().nullable().optional(),
  gananciaPorcentajeMayorista: z.number().nullable().optional(),

  // Multimedia
  imageUrl: z.string().url("Debe ser una URL válida.").nullable().optional(),

  // Legal
  supplierId: z.number().nullable().optional(),
  // licensePlate y observations están dentro de 'units'
});

// Inferir el tipo de TypeScript desde el schema Zod
export type MotorcycleBatchFormData = z.infer<typeof motorcycleBatchSchema>;
export type UnitIdentificationFormData = z.infer<typeof unitIdentificationSchema>;
