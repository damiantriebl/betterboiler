"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { motorcycleBatchSchema } from "@/zod/MotorcycleBatchSchema";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getOrganizationIdFromSession } from "../util";
import { MotorcycleState, Prisma } from "@prisma/client";
import type { MotorcycleBatchFormData } from "@/zod/MotorcycleBatchSchema";

// Types
export interface OperationResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

export interface CreateBatchResult extends OperationResult {
  createdCount?: number;
}

export interface UpdateStatusResult extends OperationResult {
  previousState?: MotorcycleState;
  newState?: MotorcycleState;
}

export interface ReserveMotorcycleParams {
  motorcycleId: number;
  reservationAmount: number;
  clientId: string;
}

// State transition rules
const STATE_TRANSITIONS: Record<MotorcycleState, MotorcycleState[]> = {
  [MotorcycleState.STOCK]: [MotorcycleState.PAUSADO, MotorcycleState.PROCESANDO, MotorcycleState.RESERVADO],
  [MotorcycleState.PAUSADO]: [MotorcycleState.STOCK, MotorcycleState.ELIMINADO],
  [MotorcycleState.RESERVADO]: [MotorcycleState.STOCK, MotorcycleState.PROCESANDO],
  [MotorcycleState.PROCESANDO]: [MotorcycleState.STOCK, MotorcycleState.VENDIDO],
  [MotorcycleState.VENDIDO]: [], // No transitions allowed from VENDIDO
  [MotorcycleState.ELIMINADO]: [MotorcycleState.STOCK],
};

// Validation helpers
function validateStateTransition(currentState: MotorcycleState, newState: MotorcycleState): boolean {
  return STATE_TRANSITIONS[currentState]?.includes(newState) ?? false;
}

async function validateOrganizationAccess(): Promise<{ organizationId: string } | null> {
  const org = await getOrganizationIdFromSession();
  return org.organizationId ? { organizationId: org.organizationId } : null;
}

// Revalidation helper
function revalidateMotorcyclePaths(): void {
  revalidatePath("/(app)/stock", "layout");
  revalidatePath("/(app)/sales", "layout");
  revalidatePath("/stock");
  revalidatePath("/sales");
}

// Core operations
export async function createMotorcycleBatch(
  prevState: CreateBatchResult | null,
  data: MotorcycleBatchFormData,
): Promise<CreateBatchResult> {
  try {
    const orgAccess = await validateOrganizationAccess();
    if (!orgAccess) {
      return { success: false, error: "Usuario no autenticado o sin organización." };
    }

    const validatedFields = motorcycleBatchSchema.safeParse(data);
    if (!validatedFields.success) {
      const errors = Object.entries(validatedFields.error.flatten().fieldErrors)
        .map(([field, messages]) => `${field}: ${(messages ?? []).join(", ")}`)
        .join("; ");
      return { success: false, error: `Datos inválidos: ${errors}` };
    }

    const { units, ...commonData } = validatedFields.data;

    // Validate unique chassis numbers in batch
    const chassisNumbers = units.map((unit) => unit.chassisNumber);
    const uniqueChassisNumbers = new Set(chassisNumbers);

    if (uniqueChassisNumbers.size !== chassisNumbers.length) {
      return {
        success: false,
        error: "Hay números de chasis duplicados en el lote. Cada número de chasis debe ser único.",
      };
    }

    // Check for existing chassis numbers in database
    const existingMotorcycles = await prisma.motorcycle.findMany({
      where: {
        chassisNumber: { in: chassisNumbers },
        organizationId: orgAccess.organizationId,
      },
      select: { chassisNumber: true },
    });

    if (existingMotorcycles.length > 0) {
      const duplicateChassisNumbers = existingMotorcycles.map((m) => m.chassisNumber).join(", ");
      return {
        success: false,
        error: `Ya existen motos con los siguientes números de chasis: ${duplicateChassisNumbers}`,
      };
    }

    // Create motorcycles in transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdMotorcycles = [];
      
      for (const unitData of units) {
        const newMotorcycle = await tx.motorcycle.create({
          data: {
            // Common data
            brandId: commonData.brandId,
            modelId: commonData.modelId,
            year: commonData.year,
            displacement: commonData.displacement,
            costPrice: commonData.costPrice,
            retailPrice: commonData.retailPrice,
            wholesalePrice: commonData.wholesalePrice,
            supplierId: commonData.supplierId,
            imageUrl: commonData.imageUrl,
            currency: commonData.currency,
            // Unit specific data
            chassisNumber: unitData.chassisNumber,
            engineNumber: unitData.engineNumber,
            colorId: unitData.colorId,
            mileage: unitData.mileage,
            branchId: unitData.branchId,
            licensePlate: unitData.licensePlate,
            state: unitData.state,
            observations: unitData.observations,
            organizationId: orgAccess.organizationId,
          },
        });
        createdMotorcycles.push(newMotorcycle);
      }
      
      return createdMotorcycles;
    });

    revalidateMotorcyclePaths();
    return { 
      success: true, 
      message: `Lote creado exitosamente: ${result.length} motocicletas agregadas.`,
      createdCount: result.length 
    };

  } catch (error) {
    console.error("Error en createMotorcycleBatch:", error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const target = (error.meta?.target as string[]) || [];
        const fieldName = target.length > 0 ? target[0] : "desconocido";
        return {
          success: false,
          error: `Error de duplicidad: Ya existe una moto con el mismo ${
            fieldName === "chassisNumber" ? "número de chasis" : 
            fieldName === "engineNumber" ? "número de motor" : fieldName
          }.`,
        };
      }
      if (error.code === "P2003") {
        return {
          success: false,
          error: "Error de referencia: La Marca, Modelo, Color, Sucursal o Proveedor seleccionado no existe.",
        };
      }
    }
    
    const message = error instanceof Error ? error.message : "Error inesperado al guardar el lote.";
    return { success: false, error: message };
  }
}

export async function updateMotorcycle(
  id: number,
  currentState: unknown,
  formData: FormData,
): Promise<OperationResult> {
  try {
    const validation = motorcycleBatchSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validation.success) {
      const errors = Object.entries(validation.error.flatten().fieldErrors)
        .map(([field, messages]) => `${field}: ${(messages ?? []).join(", ")}`)
        .join("; ");
      return {
        success: false,
        message: "Error de validación. Revise los campos.",
        error: errors,
      };
    }

    const orgAccess = await validateOrganizationAccess();
    if (!orgAccess) {
      return { success: false, message: "Error de autenticación." };
    }

    const validatedData = validation.data;
    const unitData = validatedData.units?.[0];

    if (!unitData) {
      return { success: false, message: "Faltan datos de identificación de la unidad." };
    }

    await prisma.motorcycle.update({
      where: {
        id: id,
        organizationId: orgAccess.organizationId,
      },
      data: {
        brandId: validatedData.brandId,
        modelId: validatedData.modelId,
        year: validatedData.year,
        displacement: validatedData.displacement,
        currency: validatedData.currency,
        costPrice: validatedData.costPrice,
        retailPrice: validatedData.retailPrice,
        wholesalePrice: validatedData.wholesalePrice,
        imageUrl: validatedData.imageUrl,
        supplierId: validatedData.supplierId,
        chassisNumber: unitData.chassisNumber,
        engineNumber: unitData.engineNumber,
        colorId: unitData.colorId,
        mileage: unitData.mileage,
        branchId: unitData.branchId,
        state: unitData.state,
        licensePlate: unitData.licensePlate,
        observations: unitData.observations,
      },
    });

    revalidateMotorcyclePaths();
    revalidatePath(`/stock/edit/${id}`);

    return { success: true, message: "Motocicleta actualizada correctamente." };

  } catch (error) {
    console.error("Error al actualizar la motocicleta:", error);
    return {
      success: false,
      message: "Error interno al actualizar la motocicleta.",
    };
  }
}

export async function updateMotorcycleStatus(
  motorcycleId: number,
  newStatus: MotorcycleState,
): Promise<UpdateStatusResult> {
  try {
    const orgAccess = await validateOrganizationAccess();
    if (!orgAccess) {
      return { success: false, error: "Usuario no autenticado." };
    }

    // Get current motorcycle state
    const motorcycle = await prisma.motorcycle.findUnique({
      where: { id: motorcycleId, organizationId: orgAccess.organizationId },
      select: { state: true },
    });

    if (!motorcycle) {
      return { success: false, error: "Motocicleta no encontrada." };
    }

    // Validate state transition
    if (!validateStateTransition(motorcycle.state, newStatus)) {
      return {
        success: false,
        error: `Transición de estado no permitida: ${motorcycle.state} → ${newStatus}`,
      };
    }

    const updateData: Prisma.MotorcycleUpdateInput = { state: newStatus };

    // Handle specific state transitions
    if (newStatus === MotorcycleState.STOCK && 
        (motorcycle.state === MotorcycleState.RESERVADO || 
         motorcycle.state === MotorcycleState.PROCESANDO || 
         motorcycle.state === MotorcycleState.ELIMINADO)) {
      updateData.client = { disconnect: true };
    }

    await prisma.motorcycle.update({
      where: {
        id: motorcycleId,
        organizationId: orgAccess.organizationId,
      },
      data: updateData,
    });

    revalidateMotorcyclePaths();

    return {
      success: true,
      message: `Estado actualizado de ${motorcycle.state} a ${newStatus}`,
      previousState: motorcycle.state,
      newState: newStatus,
    };

  } catch (error) {
    console.error("Error en updateMotorcycleStatus:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return {
          success: false,
          error: "No se pudo actualizar el estado. La motocicleta no existe o no permite esta transición.",
        };
      }
    }

    const message = error instanceof Error ? error.message : "Error inesperado al actualizar estado.";
    return { success: false, error: message };
  }
}

export async function reserveMotorcycle({
  motorcycleId,
  reservationAmount,
  clientId,
}: ReserveMotorcycleParams): Promise<OperationResult> {
  try {
    const orgAccess = await validateOrganizationAccess();
    if (!orgAccess) {
      return { success: false, error: "Usuario no autenticado." };
    }

    // Validate motorcycle exists and can be reserved
    const motorcycle = await prisma.motorcycle.findUnique({
      where: { id: motorcycleId, organizationId: orgAccess.organizationId },
      select: { state: true },
    });

    if (!motorcycle) {
      return { success: false, error: "Motocicleta no encontrada." };
    }

    if (!validateStateTransition(motorcycle.state, MotorcycleState.RESERVADO)) {
      return {
        success: false,
        error: `No se puede reservar una motocicleta en estado ${motorcycle.state}`,
      };
    }

    const updated = await prisma.motorcycle.update({
      where: { id: motorcycleId, organizationId: orgAccess.organizationId },
      data: {
        state: MotorcycleState.RESERVADO,
        clientId,
      },
    });

    revalidateMotorcyclePaths();

    return { 
      success: true, 
      message: "Motocicleta reservada exitosamente",
      data: { motorcycle: updated } 
    };

  } catch (error) {
    console.error("Error en reserveMotorcycle:", error);
    return { success: false, error: "No se pudo reservar la motocicleta" };
  }
}

// Utility function to get available state transitions
export function getAvailableStateTransitions(currentState: MotorcycleState): MotorcycleState[] {
  return STATE_TRANSITIONS[currentState] || [];
} 
