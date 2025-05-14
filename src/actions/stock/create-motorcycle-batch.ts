"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

// --- Import Schemas from the single source of truth ---
import {
  type MotorcycleBatchFormData,
  type UnitIdentificationFormData,
  motorcycleBatchSchema,
  unitIdentificationSchema,
} from "@/zod/MotorcycleBatchSchema";

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
    // Primero, verificar si hay números de chasis duplicados en el lote
    const chassisNumbers = units.map((unit) => unit.chassisNumber);
    const uniqueChassisNumbers = new Set(chassisNumbers);

    if (uniqueChassisNumbers.size !== chassisNumbers.length) {
      return {
        success: false,
        error: "Hay números de chasis duplicados en el lote. Cada número de chasis debe ser único.",
      };
    }

    // Verificar si ya existen motos con estos números de chasis en la base de datos
    const existingMotorcycles = await prisma.motorcycle.findMany({
      where: {
        chassisNumber: {
          in: chassisNumbers,
        },
      },
      select: {
        chassisNumber: true,
      },
    });

    if (existingMotorcycles.length > 0) {
      const duplicateChassisNumbers = existingMotorcycles.map((m) => m.chassisNumber).join(", ");
      return {
        success: false,
        error: `Ya existen motos con los siguientes números de chasis: ${duplicateChassisNumbers}`,
      };
    }

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      const createdMotorcycles = [];
      // Use the imported UnitIdentificationFormData type here if needed, though Zod already validated
      for (const unitData of units) {
        try {
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
        } catch (error) {
          // Capturar errores específicos por moto
          console.error(`Error al crear moto con chasis ${unitData.chassisNumber}:`, error);
          throw error; // Re-lanzar para que la transacción falle
        }
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
        // Obtener el campo que causó el error de unicidad
        const target = (error.meta?.target as string[]) || [];
        const fieldName = target.length > 0 ? target[0] : "desconocido";

        return {
          success: false,
          error: `Error de duplicidad: Ya existe una moto con el mismo ${fieldName === "chassisNumber" ? "número de chasis" : fieldName === "engineNumber" ? "número de motor" : fieldName}.`,
        };
      }
      if (error.code === "P2003") {
        return {
          success: false,
          error:
            "Error de referencia: La Marca, Modelo, Color, Sucursal o Proveedor seleccionado no existe.",
        };
      }
    }
    const message = error instanceof Error ? error.message : "Error inesperado al guardar el lote.";
    return { success: false, error: message };
  }
}
