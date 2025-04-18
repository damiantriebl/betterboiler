import * as z from "zod";
import { EstadoVenta } from "@/types/BikesType"; // Importar el enum

// Schema for ONE identification unit
export const unitIdentificationSchema = z.object({
  idTemporal: z.number(), // Frontend key, not saved to DB
  // Use English field names to match Prisma schema
  chassisNumber: z.string().min(1, "Chasis requerido"), // nroChasis
  engineNumber: z.string().optional().nullable(), // nroMotor
  colorId: z.coerce
    .number({ invalid_type_error: "Selecciona un color" })
    .int()
    .positive("Selecciona un color"),
  mileage: z.coerce.number().int().nonnegative("Km no puede ser negativo").default(0), // kilometraje
  branchId: z.coerce
    .number({ invalid_type_error: "Selecciona una sucursal" })
    .int()
    .positive("Selecciona una sucursal"), // sucursalId
  state: z.nativeEnum(EstadoVenta).default(EstadoVenta.STOCK), // Añadir state
});

// Main schema for the BATCH
export const motorcycleBatchSchema = z
  .object({
    // Use English field names
    brandId: z.coerce
      .number({ invalid_type_error: "Selecciona una marca" })
      .int()
      .positive("Selecciona una marca"), // marcaId
    modelId: z.coerce
      .number({ invalid_type_error: "Selecciona un modelo" })
      .int()
      .positive("Selecciona un modelo"), // modeloId
    year: z.coerce
      .number()
      .int()
      .min(1900, "Año inválido")
      .max(new Date().getFullYear() + 1, "El año no puede ser mayor al próximo"), // año
    displacement: z.coerce
      .number()
      .int()
      .positive("La cilindrada debe ser un número positivo.")
      .nullable(), // cilindrada
    units: z.array(unitIdentificationSchema).min(1, "Debes añadir al menos una unidad."),
    costPrice: z.coerce
      .number()
      .nonnegative("El precio de costo no puede ser negativo.")
      .nullable(), // precioCosto
    retailPrice: z.coerce.number().nonnegative("El precio minorista debe ser 0 o positivo."), // precioVentaMinorista
    wholesalePrice: z.coerce
      .number()
      .nonnegative("El precio mayorista no puede ser negativo.")
      .nullable(), // precioVentaMayorista
    currency: z
      .enum(["ARS", "USD"], { errorMap: () => ({ message: "Selecciona una moneda válida." }) })
      .default("ARS"),
    ivaPorcentajeMinorista: z.coerce.number().min(0).max(100).nullable().default(21),
    otrosImpuestosMinorista: z.coerce.number().nonnegative().nullable(),
    gananciaPorcentajeMinorista: z.coerce.number().nullable(),
    ivaPorcentajeMayorista: z.coerce.number().min(0).max(100).nullable().default(21),
    otrosImpuestosMayorista: z.coerce.number().nonnegative().nullable(),
    gananciaPorcentajeMayorista: z.coerce.number().nullable(),
    supplierId: z.coerce.number().int().positive().nullable(), // proveedorId
    imageUrl: z.string().url("URL de imagen inválida").nullable(), // imagenPrincipalUrl
    licensePlate: z.string().max(10, "Máximo 10 caracteres para patente").nullable(), // patente
  })
  .superRefine((data, ctx) => {
    const chassisNumbers = new Set<string>();
    const engineNumbers = new Set<string>();
    const reportedDuplicates = { chassis: new Set<string>(), engine: new Set<string>() };

    data.units.forEach((unit, index) => {
      const unitData = unit;
      // Check for duplicate chassis numbers
      if (unitData.chassisNumber && chassisNumbers.has(unitData.chassisNumber)) {
        if (!reportedDuplicates.chassis.has(unitData.chassisNumber)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Duplicado",
            path: ["units", index, "chassisNumber"],
          });
          reportedDuplicates.chassis.add(unitData.chassisNumber);
        }
      } else if (unitData.chassisNumber) {
        chassisNumbers.add(unitData.chassisNumber);
      }

      // Check for duplicate engine numbers
      if (unitData.engineNumber && engineNumbers.has(unitData.engineNumber)) {
        if (!reportedDuplicates.engine.has(unitData.engineNumber)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Duplicado",
            path: ["units", index, "engineNumber"],
          });
          reportedDuplicates.engine.add(unitData.engineNumber);
        }
      } else if (unitData.engineNumber) {
        engineNumbers.add(unitData.engineNumber);
      }
    });
  });

// Export inferred types
export type MotorcycleBatchFormData = z.infer<typeof motorcycleBatchSchema>;
// Rename UnitIdentificationFormData to avoid conflict if needed elsewhere, or keep as is
export type UnitIdentificationFormData = z.infer<typeof unitIdentificationSchema>;
