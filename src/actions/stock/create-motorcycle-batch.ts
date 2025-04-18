"use server";

import prisma from "@/lib/prisma";
import { z } from "zod";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

// --- Import Schemas from the single source of truth ---
import {
  motorcycleBatchSchema,
  unitIdentificationSchema,
  type MotorcycleBatchFormData,
  type UnitIdentificationFormData,
} from "@/zod/NewBikeZod";

// --- Schemas (Removed local definitions) ---
/* 
const unitIdentificationSchema = z.object({ ... });
const motorcycleBatchSchema = z.object({ ... });
*/

// Type for the data received by the action (Now inferred from imported schema)
// type MotorcycleBatchFormData = z.infer<typeof motorcycleBatchSchema>; // No longer needed here

// Type for the action's return state
export interface CreateBatchState {
  success: boolean;
  error?: string | null;
  createdCount?: number;
}

// Helper function to get organizationId
async function getOrganizationIdFromSession(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.organizationId ?? null;
}

// Use the imported type MotorcycleBatchFormData
export async function createMotorcycleBatch(
  prevState: CreateBatchState | null,
  data: MotorcycleBatchFormData,
): Promise<CreateBatchState> {
  const organizationId = await getOrganizationIdFromSession();
  if (!organizationId)
    return { success: false, error: "User not authenticated or without organization." };

  // Validate received data using the imported schema
  const validatedFields = motorcycleBatchSchema.safeParse(data);
  if (!validatedFields.success) {
    const errors = Object.entries(validatedFields.error.flatten().fieldErrors)
      .map(([field, messages]) => `${field}: ${(messages ?? []).join(", ")}`)
      .join("; ");
    console.error("Server Action Validation Error:", validatedFields.error.flatten());
    return { success: false, error: `Invalid data received by action: ${errors}` };
  }

  // Extract common data and the list of units (using English field names now)
  const { units, ...commonData } = validatedFields.data;

  try {
    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      const createdMotorcycles = [];
      // Use the imported UnitIdentificationFormData type here if needed, though Zod already validated
      for (const unitData of units) {
        // Create each motorcycle using English field names directly
        const newMotorcycle = await tx.motorcycle.create({
          data: {
            // --- Common Data (Directly use validated English names) ---
            brandId: commonData.brandId,
            modelId: commonData.modelId,
            year: commonData.year,
            displacement: commonData.displacement,
            costPrice: commonData.costPrice, // Use correct English name
            retailPrice: commonData.retailPrice, // Use correct English name
            wholesalePrice: commonData.wholesalePrice, // Use correct English name
            supplierId: commonData.supplierId, // Use correct English name
            imageUrl: commonData.imageUrl, // Use correct English name
            licensePlate: commonData.licensePlate, // Use correct English name
            currency: commonData.currency, // Add currency

            // --- Specific Unit Data (Directly use validated English names) ---
            chassisNumber: unitData.chassisNumber, // Use correct English name
            engineNumber: unitData.engineNumber, // Use correct English name
            colorId: unitData.colorId,
            mileage: unitData.mileage, // Use correct English name
            branchId: unitData.branchId, // Use correct English name
            state: unitData.state,

            // --- Other Required Data ---
            organizationId: organizationId,
          },
        });
        createdMotorcycles.push(newMotorcycle);
      }
      return createdMotorcycles;
    });

    console.log(`Batch created: ${result.length} motorcycles added.`);
    revalidatePath("/stock");
    return { success: true, createdCount: result.length };
  } catch (error) {
    console.error("🔥 SERVER ACTION ERROR (createLoteMotosAction):", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          success: false,
          error: "Database Error: Possible duplicate Chassis or Engine Number.",
        };
      }
      if (error.code === "P2003") {
        return {
          success: false,
          error: "Database Error: The selected Color, Branch, Brand, Model, or Supplier does not exist.",
        };
      }
    }
    const message = error instanceof Error ? error.message : "Unexpected error saving batch.";
    return { success: false, error: message };
  }
}
