import { z } from 'zod';

export const modelNameSchema = z.string().min(1, "El nombre del modelo no puede estar vacío.").max(100, "El nombre del modelo es demasiado largo.");

export const createModelSchema = z.object({
    brandId: z.number().int().positive("ID de marca inválido para el modelo"),
    name: modelNameSchema,
});

export const updateModelSchema = z.object({
    id: z.number().int().positive("ID de modelo inválido"),
    brandId: z.number().int().positive("ID de marca inválido para el modelo"), // Include brandId for context
    name: modelNameSchema,
});

export const modelOrderSchema = z.object({
    modelId: z.number().int().positive(),
    order: z.number().int().min(0),
});

export const updateModelsOrderSchema = z.object({
    brandId: z.number().int().positive(),
    modelOrders: z.array(modelOrderSchema),
}); 