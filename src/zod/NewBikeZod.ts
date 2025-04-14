import * as z from "zod";

// Schema para UNA identificación
export const unitIdentificationSchema = z.object({
    idTemporal: z.number(), // Para key en React
    nroChasis: z.string().min(1, "Chasis requerido"),
    nroMotor: z.string().optional().nullable(), // Motor es opcional
    colorId: z.coerce.number({ invalid_type_error: "Selecciona un color" }).int().positive("Selecciona un color"), // Color es requerido por unidad
    kilometraje: z.coerce.number().int().nonnegative("Km no puede ser negativo").default(0),
    sucursalId: z.coerce.number({ invalid_type_error: "Selecciona una sucursal" }).int().positive("Selecciona una sucursal"), // Sucursal es requerida por unidad
});

// Schema principal para el LOTE
export const motorcycleBatchSchema = z.object({
    marcaId: z.coerce.number({ invalid_type_error: "Selecciona una marca" }).int().positive("Selecciona una marca"), // Marca es requerida
    modeloId: z.coerce.number({ invalid_type_error: "Selecciona un modelo" }).int().positive("Selecciona un modelo"), // Modelo es requerido
    año: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1),
    cilindrada: z.coerce.number().int().positive().optional().nullable(), // Cilindrada es opcional
    units: z.array(unitIdentificationSchema).min(1, "Debes añadir al menos una unidad."), // Usar el schema exportado
    precioCompra: z.coerce.number().positive().optional().nullable(),
    precioVentaMinorista: z.coerce.number().positive("Precio minorista requerido"),
    precioVentaMayorista: z.coerce.number().positive().optional().nullable(),
    proveedorId: z.coerce.number().int().positive().optional().nullable(), // Proveedor es opcional
    imagenPrincipalUrl: z.string().url().optional().nullable(),
    patente: z.string().optional().nullable(),
});

// Exportar tipos inferidos
export type MotorcycleBatchFormData = z.infer<typeof motorcycleBatchSchema>;
export type UnitIdentificationFormData = z.infer<typeof unitIdentificationSchema>; // Renombrar para claridad
