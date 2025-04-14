"use server";

import prisma from "@/lib/prisma";
import { z } from "zod";
import { auth } from "@/auth";
import { headers } from 'next/headers';
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

// --- Schemas --- 
// Renamed to English, field names kept in Spanish for frontend compatibility for now

const unitIdentificationSchema = z.object({
    idTemporal: z.number(), // Frontend internal ID, not saved
    // TODO: Consider renaming these fields to English (e.g., chassisNumber) and updating NuevaMotoForm accordingly
    nroChasis: z.string().min(1, "Chasis requerido"),
    nroMotor: z.string().optional().nullable(), // Motor can be optional
    colorId: z.coerce.number({invalid_type_error: "Color ID inválido"}).int().positive("Color requerido"),
    kilometraje: z.coerce.number().int().nonnegative().default(0),
    sucursalId: z.coerce.number({invalid_type_error: "Sucursal ID inválido"}).int().positive("Sucursal requerida"),
});

const motorcycleBatchSchema = z.object({
    // TODO: Consider renaming these fields to English (e.g., brandId) and updating NuevaMotoForm accordingly
    marcaId: z.coerce.number({invalid_type_error: "Marca ID inválido"}).int().positive("Marca requerida"),
    modeloId: z.coerce.number({invalid_type_error: "Modelo ID inválido"}).int().positive("Modelo requerido"),
    año: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1),
    cilindrada: z.coerce.number().int().positive().optional().nullable(), // Optional?
    units: z.array(unitIdentificationSchema).min(1, "Debes añadir al menos una unidad."), // Renamed field
    precioCompra: z.coerce.number().positive().optional().nullable(),
    precioVentaMinorista: z.coerce.number().positive("Precio minorista requerido"),
    precioVentaMayorista: z.coerce.number().positive().optional().nullable(),
    proveedorId: z.coerce.number().int().positive().optional().nullable(),
    imagenPrincipalUrl: z.string().url().optional().nullable(),
    patente: z.string().optional().nullable(),
});

// Type for the data received by the action
type MotorcycleBatchFormData = z.infer<typeof motorcycleBatchSchema>;

// Type for the action's return state
export interface CreateBatchState { // Renamed State
    success: boolean;
    error?: string | null;
    createdCount?: number;
}

// Helper function to get organizationId
async function getOrganizationIdFromSession(): Promise<string | null> {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user?.organizationId ?? null;
}

export async function createLoteMotosAction(prevState: CreateBatchState | null, data: MotorcycleBatchFormData): Promise<CreateBatchState> { // Renamed State
    const organizationId = await getOrganizationIdFromSession();
    if (!organizationId) return { success: false, error: "User not authenticated or without organization." };

    // Validate received data
    const validatedFields = motorcycleBatchSchema.safeParse(data);
    if (!validatedFields.success) {
        const errors = Object.entries(validatedFields.error.flatten().fieldErrors)
            .map(([field, messages]) => `${field}: ${(messages ?? []).join(', ')}`)
            .join('; ');
        console.error("Server Action Validation Error:", validatedFields.error.flatten());
        return { success: false, error: `Invalid data received by action: ${errors}` };
    }

    // Extract common data and the list of units
    const { units, ...commonData } = validatedFields.data;

    // Double-check required IDs (already handled by Zod positive() checks)
    // Note: proveedorId is handled as optional/nullable by Prisma

    try {
        // Use transaction for atomicity
        const result = await prisma.$transaction(async (tx) => {
            const createdMotorcycles = []; // Renamed
            for (const unitData of units) { // Renamed
                // Create each motorcycle combining common and specific data
                // Ensure field names match your actual Prisma model (`Motorcycle`)
                const newMotorcycle = await tx.motorcycle.create({ // Use correct model name
                    data: {
                        // --- Common Data --- (Match fields in schema.prisma Motorcycle model)
                        brandId: commonData.marcaId, 
                        modelId: commonData.modeloId,
                        year: commonData.año,
                        displacement: commonData.cilindrada, // Correct field name
                        costPrice: commonData.precioCompra,
                        retailPrice: commonData.precioVentaMinorista,
                        wholesalePrice: commonData.precioVentaMayorista,
                        supplierId: commonData.proveedorId, // Assuming proveedorId -> supplierId
                        imageUrl: commonData.imagenPrincipalUrl,
                        licensePlate: commonData.patente,

                        // --- Specific Unit Data --- (Match fields in schema.prisma Motorcycle model)
                        chassisNumber: unitData.nroChasis, // Assuming nroChasis -> chassisNumber
                        engineNumber: unitData.nroMotor,  // Assuming nroMotor -> engineNumber
                        colorId: unitData.colorId,      // Assuming colorId is the correct FK name
                        mileage: unitData.kilometraje,
                        branchId: unitData.sucursalId,  // Assuming sucursalId -> branchId
                        
                        // --- Other Required Data --- (Match fields in schema.prisma Motorcycle model)
                        organizationId: organizationId,
                        state: "AVAILABLE", // Example: Set initial state
                    }
                });
                createdMotorcycles.push(newMotorcycle);
            }
            return createdMotorcycles; // Return created motorcycles
        });

        console.log(`Batch created: ${result.length} motorcycles added.`);
        revalidatePath("/stock"); // Revalidate stock page
        return { success: true, createdCount: result.length };

    } catch (error) {
        console.error("🔥 SERVER ACTION ERROR (createLoteMotosAction):", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
             if (error.code === 'P2002') {
                 // Unique constraint violation (likely chassisNumber or engineNumber)
                 return { success: false, error: `Database Error: Possible duplicate Chassis or Engine Number.` };
             }
              if (error.code === 'P2003') {
                 // Foreign key constraint failed (e.g., colorId, branchId, brandId, modelId, supplierId doesn't exist)
                 return { success: false, error: `Database Error: The selected Color, Branch, Brand, Model, or Supplier does not exist.` };
             }
        }
        const message = error instanceof Error ? error.message : "Unexpected error saving batch.";
        return { success: false, error: message };
    }
} 