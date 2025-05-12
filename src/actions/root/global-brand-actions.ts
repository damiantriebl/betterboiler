"use server";

import db from "@/lib/prisma"; // Use default import
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
    createBrandSchema,
    updateBrandSchema,
    updateBrandsOrderSchema,
} from "@/zod/brand-schemas";
import {
    createModelSchema,
    updateModelSchema,
    updateModelsOrderSchema,
} from "@/zod/model-schemas";
import type {
    ActionState,
    CreateBrandState,
    UpdateBrandState,
    CreateModelState,
    UpdateModelState,
    BatchActionState,
} from "@/types/action-states";
import { Prisma } from "@prisma/client";

// Helper function to handle Prisma errors and return ActionState
function handlePrismaError(error: unknown, defaultMessage: string): ActionState<null> {
    console.error("Prisma Error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Specific Prisma errors (e.g., unique constraint violation)
        if (error.code === 'P2002') {
            // Assuming the target is the name field for unique constraints
            const field = (error.meta?.target as string[])?.includes('name') ? 'nombre' : 'campo';
            return { success: false, error: `Ya existe un registro con ese ${field}.` };
        }
        // Add more specific error codes if needed
    }
    if (error instanceof z.ZodError) { // Catch Zod errors passed through
        return { success: false, error: "Error de validación: " + Object.values(error.flatten().fieldErrors).flat().join(", ") };
    }
    return { success: false, error: defaultMessage };
}

// --- Read Actions ---

export async function getRootBrands() {
    try {
        const brands = await db.brand.findMany({
            orderBy: { name: 'asc' }, // Order by name as default
            include: {
                models: {
                    orderBy: { name: 'asc' }, // Order by name as default
                    include: {
                        files: true, // Include model files
                    },
                },
            },
        });

        // Transform the data to include file status for each brand
        const brandsWithFileStatus = brands.map(brand => {
            const hasPhoto = brand.models.some(model => 
                model.imageUrl || model.files.some(file => file.type === 'image')
            );
            const hasTechnicalSheet = brand.models.some(model => 
                model.specSheetUrl || model.files.some(file => file.type === 'spec_sheet')
            );
            const hasOtherFiles = brand.models.some(model => 
                model.files.some(file => !['image', 'spec_sheet'].includes(file.type))
            );

            return {
                ...brand,
                files: {
                    hasPhoto,
                    hasTechnicalSheet,
                    hasOtherFiles
                }
            };
        });

        return brandsWithFileStatus;
    } catch (error) {
        console.error("Error fetching root brands:", error);
        return [];
    }
}


// --- Create Actions ---

export async function createRootBrand(
    prevState: CreateBrandState, // Required for useActionState
    formData: FormData
): Promise<CreateBrandState> {
    const rawFormData = {
        name: formData.get("name"),
        color: formData.get("color")?.toString() || null,
    };

    // Validate form data
    const validatedFields = createBrandSchema.safeParse(rawFormData);
    if (!validatedFields.success) {
        console.error("Validation Error:", validatedFields.error.flatten().fieldErrors);
        return {
            success: false,
            error: "Error de validación: " + Object.values(validatedFields.error.flatten().fieldErrors).flat().join(", "),
        };
    }

    const { name, color } = validatedFields.data;

    try {
        // Check for existing brand with the same name (case-insensitive)
        const existingBrand = await db.brand.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } },
        });

        if (existingBrand) {
            return { success: false, error: `La marca "${name}" ya existe.` };
        }

        // Create brand
        const newBrand = await db.brand.create({
            data: {
                name: name,
                color: color,
                // isGlobal: true, // Set flag if applicable
                // order: await getNextBrandOrder(), // Optional: logic to set next order
            },
        });

        // Revalidate the path to update cache
        revalidatePath("/root/global-brands"); // Adjust path if needed

        return { success: true, message: `Marca "${newBrand.name}" creada.` };

    } catch (error) {
        console.error("Error creating root brand:", error);
        if (error instanceof z.ZodError) { // Should be caught by safeParse, but belt-and-suspenders
             return { success: false, error: "Error de validación." };
        }
        return { success: false, error: "Error del servidor al crear la marca." };
    }
}

export async function createRootModel(
    prevState: CreateModelState, // Required for useActionState
    formData: FormData
): Promise<CreateModelState> {
    const rawFormData = {
        name: formData.get("name"),
        brandId: Number(formData.get("brandId")) || null, // Ensure brandId is number
    };

    const validatedFields = createModelSchema.safeParse(rawFormData);
    if (!validatedFields.success) {
        return { success: false, error: "Error de validación: " + Object.values(validatedFields.error.flatten().fieldErrors).flat().join(", ") };
    }
    const { name, brandId } = validatedFields.data;

    try {
         // Optional: Check if brand exists
         const brandExists = await db.brand.findUnique({ where: { id: brandId } });
         if (!brandExists) {
             return { success: false, error: "La marca especificada no existe." };
         }

        // Check for existing model name within the same brand (case-insensitive)
        const existing = await db.model.findFirst({
            where: { name: { equals: name, mode: 'insensitive' }, brandId: brandId }
        });
        if (existing) return { success: false, error: `El modelo "${name}" ya existe para esta marca.` };

        // TODO: Determine next order for the model within the brand
        // const nextOrder = await getNextModelOrder(brandId);

        const newModel = await db.model.create({
            data: {
                name,
                brandId,
                // order: nextOrder, // Assign order
            }
        });
        revalidatePath("/root/global-brands");
        // Returning the new model might be useful for optimistic updates
        return { success: true, message: `Modelo "${newModel.name}" añadido.`, data: newModel };
    } catch (error) {
        // Directly return error state matching CreateModelState signature
        const errorState = handlePrismaError(error, "Error del servidor al añadir el modelo.");
        return { success: false, error: errorState.error };
    }
}

// --- Update Actions ---

export async function updateRootBrand(
    prevState: UpdateBrandState, // Required for useActionState
    formData: FormData
): Promise<UpdateBrandState> {
    const rawFormData = {
        id: Number(formData.get("id")) || null,
        name: formData.get("name"),
    };
    const validatedFields = updateBrandSchema.safeParse(rawFormData);
    if (!validatedFields.success) {
        return { success: false, error: "Error de validación: " + Object.values(validatedFields.error.flatten().fieldErrors).flat().join(", ") };
    }
    const { id, name } = validatedFields.data;

    try {
         // Check if another brand already has the new name (case-insensitive)
         const existing = await db.brand.findFirst({
            where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } }
        });
        if (existing) return { success: false, error: `Ya existe otra marca con el nombre "${name}".` };

        const updatedBrand = await db.brand.update({
            where: { id },
            data: { name },
        });
        revalidatePath("/root/global-brands");
        return { success: true, message: `Marca "${updatedBrand.name}" actualizada.`, data: updatedBrand };
    } catch (error) {
        // Directly return error state matching UpdateBrandState signature
        const errorState = handlePrismaError(error, "Error del servidor al actualizar la marca.");
        return { success: false, error: errorState.error };
    }
}

export async function updateRootModel(
    prevState: UpdateModelState, // Required for useActionState
    formData: FormData
): Promise<UpdateModelState> {
    const rawFormData = {
        id: Number(formData.get("id")) || null,
        brandId: Number(formData.get("brandId")) || null,
        name: formData.get("name"),
    };
    const validatedFields = updateModelSchema.safeParse(rawFormData);
    if (!validatedFields.success) {
        return { success: false, error: "Error de validación: " + Object.values(validatedFields.error.flatten().fieldErrors).flat().join(", ") };
    }
    const { id, brandId, name } = validatedFields.data;

    try {
         // Check if another model in the same brand already has the new name (case-insensitive)
        const existing = await db.model.findFirst({
            where: {
                name: { equals: name, mode: 'insensitive' },
                brandId: brandId,
                id: { not: id }
            }
        });
        if (existing) return { success: false, error: `Ya existe otro modelo con el nombre "${name}" para esta marca.` };

        const updatedModel = await db.model.update({
            where: { id }, // Unique identifier for the model
            data: { name },
        });
        revalidatePath("/root/global-brands");
        return { success: true, message: `Modelo "${updatedModel.name}" actualizado.`, data: updatedModel };
    } catch (error) {
        // Directly return error state matching UpdateModelState signature
        const errorState = handlePrismaError(error, "Error del servidor al actualizar el modelo.");
        return { success: false, error: errorState.error };
    }
}

// --- Delete Actions ---

export async function deleteRootBrand(brandId: number): Promise<ActionState> {
    if (!brandId || typeof brandId !== 'number') {
        return { success: false, error: "ID de marca inválido." };
    }
    try {
        // Optional: Check if brand has associated models if deletion should be blocked
        // const modelCount = await db.model.count({ where: { brandId } });
        // if (modelCount > 0) {
        //     return { success: false, error: "No se puede eliminar la marca porque tiene modelos asociados." };
        // }

        await db.brand.delete({ where: { id: brandId } });
        revalidatePath("/root/global-brands");
        return { success: true, message: "Marca eliminada." };
    } catch (error) {
        return handlePrismaError(error, "Error del servidor al eliminar la marca.");
    }
}

export async function deleteRootModel(modelId: number): Promise<ActionState> {
    if (!modelId || typeof modelId !== 'number') {
        return { success: false, error: "ID de modelo inválido." };
    }
    try {
        await db.model.delete({ where: { id: modelId } });
        revalidatePath("/root/global-brands");
        return { success: true, message: "Modelo eliminado." };
    } catch (error) {
        return handlePrismaError(error, "Error del servidor al eliminar el modelo.");
    }
}

// --- Order Actions ---

export async function updateRootBrandsOrder(orderData: { id: number; order: number }[]): Promise<BatchActionState> {
    const validatedData = updateBrandsOrderSchema.safeParse(orderData);
    if (!validatedData.success) {
        return { success: false, error: "Datos de ordenación de marcas inválidos." };
    }

    // Note: This action currently only validates input and revalidates path.
    // It does NOT persist order as the 'order' field is assumed non-existent in the DB schema.
    // If an 'order' field exists, uncomment the 'data' part in the transaction.
    console.log("Attempting to update brand order (validation only):", validatedData.data);

    try {
        // Transaction included for structure, but update operations are commented out/removed
        /*
        await db.$transaction(
            validatedData.data.map((brand) =>
                db.brand.update({ where: { id: brand.id }, data: { order: brand.order } }) // Requires 'order' field
            )
        );
        */
        revalidatePath("/root/global-brands");
        // Return success as input was valid, even if DB wasn't changed.
        return { success: true, message: "Orden de marcas validado (no persistido)." };
    } catch (error) {
        return handlePrismaError(error, "Error del servidor durante la validación del orden de marcas.");
    }
}

export async function updateRootModelsOrder(orderPayload: { brandId: number; modelOrders: { modelId: number; order: number }[] }): Promise<BatchActionState> {
     const validatedPayload = updateModelsOrderSchema.safeParse(orderPayload);
     if (!validatedPayload.success) {
         return { success: false, error: "Datos de ordenación de modelos inválidos." };
     }
     const { brandId, modelOrders } = validatedPayload.data;

     // Note: This action currently only validates input and revalidates path.
     // It does NOT persist order as the 'order' field is assumed non-existent in the DB schema.
     // If an 'order' field exists, uncomment the 'data' part in the transaction.
    console.log(`Attempting to update model order for brand ${brandId} (validation only):`, modelOrders);

     try {
         // Transaction included for structure, but update operations are commented out/removed
        /*
         await db.$transaction(
             modelOrders.map((model) =>
                 db.model.update({ where: { id: model.modelId }, data: { order: model.order } }) // Requires 'order' field
             )
         );
        */
         revalidatePath("/root/global-brands"); // Could optimize
         // Return success as input was valid, even if DB wasn't changed.
         return { success: true, message: "Orden de modelos validado (no persistido)." };
     } catch (error) {
         return handlePrismaError(error, "Error del servidor durante la validación del orden de modelos.");
     }
}

// Helper function example (if needed)
// async function getNextModelOrder(brandId: number): Promise<number> {
//     const lastModel = await db.model.findFirst({ where: { brandId }, orderBy: { order: 'desc' } });
//     return (lastModel?.order ?? -1) + 1;
// } 