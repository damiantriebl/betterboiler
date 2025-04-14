import { z } from "zod";

// Common Enum and Type
export const ColorTypeEnum = z.enum(['SOLIDO', 'BITONO', 'PATRON']);
export type ColorType = z.infer<typeof ColorTypeEnum>;

// Base Schema for Color Data (without ID, without refinement)
export const motoColorBaseSchema = z.object({
    nombre: z.string().min(1, "El nombre es requerido."),
    tipo: ColorTypeEnum,
    color1: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color 1 inválido (#RRGGBB)"),
    color2: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color 2 inválido (#RRGGBB)").optional().nullable(),
    // organizationId is typically added server-side from session
});

// Refined Schema for Create/Update (enforces color2 logic)
export const refinedMotoColorSchema = motoColorBaseSchema.refine(
    (data) => !(data.tipo === "BITONO" || data.tipo === "PATRON") || !!data.color2,
    { message: "Se requiere Color 2 para los tipos 'BITONO' y 'PATRON'.", path: ["color2"] }
).refine(
    (data) => !(data.tipo === "SOLIDO" && data.color2),
    { message: "No se debe proporcionar Color 2 para el tipo 'SOLIDO'.", path: ["color2"] }
);

// Schema specifically for the Create action (can just be the refined one)
// Note: organizationId is added in the action itself
export const createColorSchema = refinedMotoColorSchema;
export type CreateColorFormData = z.infer<typeof createColorSchema>;

// Schema specifically for the Update action (includes ID)
// CORRECTION: Use .extend() on the BASE schema, then refine again if needed
// or refine the extended schema directly.
export const updateColorActionSchema = motoColorBaseSchema.extend({
    id: z.coerce.number().int(),
     // organizationId is added in the action itself
}).refine(
    (data) => !(data.tipo === "BITONO" || data.tipo === "PATRON") || !!data.color2,
    { message: "Se requiere Color 2 para los tipos 'BITONO' y 'PATRON'.", path: ["color2"] }
).refine(
    (data) => !(data.tipo === "SOLIDO" && data.color2),
    { message: "No se debe proporcionar Color 2 para el tipo 'SOLIDO'.", path: ["color2"] }
);
export type UpdateColorFormData = z.infer<typeof updateColorActionSchema>;


// Schema for the Delete action
export const deleteColorSchema = z.object({
    id: z.coerce.number().int(),
});
export type DeleteColorFormData = z.infer<typeof deleteColorSchema>;

// Schema for Updating Colors Order
export const updateColorsOrderSchema = z.object({
    // Expects an array of objects with id and order
    colors: z.array(z.object({
        id: z.number().int(),
        order: z.number().int().min(0),
    })).min(0), // Allow empty array
    // organizationId is typically passed separately or obtained server-side
});
export type UpdateColorsOrderPayload = z.infer<typeof updateColorsOrderSchema>; // Type for the payload structure
