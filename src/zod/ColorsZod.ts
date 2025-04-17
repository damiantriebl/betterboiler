import { z } from "zod";

// Common Enum and Type
export const ColorTypeEnum = z.enum(['SOLIDO', 'BITONO', 'PATRON']);
export type ColorType = z.infer<typeof ColorTypeEnum>;

// Base Schema for Color Data (without ID, without refinement)
const colorBaseSchema = z.object({
    name: z.string().min(1, "El nombre es requerido.").max(50, "Nombre demasiado largo (máx 50)"),
    type: z.enum(['SOLIDO', 'BITONO', 'PATRON'], { errorMap: () => ({ message: 'Tipo inválido' }) }),
    colorOne: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Formato de color inválido (#RRGGBB)"),
    colorTwo: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Formato de color inválido (#RRGGBB)").nullable().optional(),
});

// Refined Schema for Create/Update (enforces color2 logic)
export const refinedMotoColorSchema = colorBaseSchema.refine(
    (data) => !(data.type === "BITONO" || data.type === "PATRON") || !!data.colorTwo,
    { message: "Se requiere Color 2 para los tipos 'BITONO' y 'PATRON'.", path: ["colorTwo"] }
).refine(
    (data) => !(data.type === "SOLIDO" && data.colorTwo),
    { message: "No se debe proporcionar Color 2 para el tipo 'SOLIDO'.", path: ["colorTwo"] }
);

// Schema specifically for the Create action (can just be the refined one)
// Note: organizationId is added in the action itself
export const createColorSchema = colorBaseSchema.extend({
    organizationId: z.string()
}).refine(data => data.type === 'SOLIDO' ? data.colorTwo === null || data.colorTwo === undefined : true, {
    message: "Color 2 debe ser nulo para tipo SOLIDO",
    path: ["colorTwo"],
}).refine(data => data.type !== 'SOLIDO' ? data.colorTwo !== null && data.colorTwo !== undefined : true, {
    message: "Color 2 es requerido para tipos diferentes de SOLIDO",
    path: ["colorTwo"],
});
export type CreateColorFormData = z.infer<typeof createColorSchema>;

// Schema specifically for the Update action (includes ID)
// CORRECTION: Use .extend() on the BASE schema, then refine again if needed
// or refine the extended schema directly.
export const updateColorActionSchema = colorBaseSchema.extend({
    id: z.coerce.number().int().positive("ID inválido"),
    organizationId: z.string()
}).refine(data => data.type === 'SOLIDO' ? data.colorTwo === null || data.colorTwo === undefined : true, {
    message: "Color 2 debe ser nulo para tipo SOLIDO",
    path: ["colorTwo"],
}).refine(data => data.type !== 'SOLIDO' ? data.colorTwo !== null && data.colorTwo !== undefined : true, {
    message: "Color 2 es requerido para tipos diferentes de SOLIDO",
    path: ["colorTwo"],
});
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
