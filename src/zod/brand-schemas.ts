import { z } from 'zod';

export const brandNameSchema = z.string().min(1, "El nombre de la marca no puede estar vacío.").max(100, "El nombre de la marca es demasiado largo.");

export const createBrandSchema = z.object({
    name: brandNameSchema,
});

export const updateBrandSchema = z.object({
    id: z.number().int().positive("ID de marca inválido"),
    name: brandNameSchema,
});

export const brandOrderSchema = z.object({
    id: z.number().int().positive(),
    order: z.number().int().min(0),
});

export const updateBrandsOrderSchema = z.array(brandOrderSchema); 