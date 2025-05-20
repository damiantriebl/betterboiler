"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  createBranchSchema,
  deleteBranchSchema,
  updateBranchOrderSchema,
  updateBranchSchema,
} from "@/zod/BranchZod"; 
// LOS ZOD SCHEMAS YA USAN "Branch", LO CUAL ES BUENO.
import { Prisma, type Branch } from "@prisma/client"; // CAMBIADO Sucursal a Branch
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

// Helper para obtener organizationId de la sesión (sin cambios)
async function getOrganizationIdFromSession(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.organizationId ?? null;
}

// --- Acción: createBranch ---
export interface CreateBranchState { // CAMBIADO
  success: boolean;
  error?: string | null;
  branch?: Branch | null; // CAMBIADO y tipo Branch
}

export async function createBranch( // CAMBIADO
  prevState: CreateBranchState | null,
  formData: FormData,
): Promise<CreateBranchState> { // CAMBIADO
  const organizationId = await getOrganizationIdFromSession();
  if (!organizationId)
    return { success: false, error: "Usuario no autenticado o sin organización." };

  const validatedFields = createBranchSchema.safeParse({
    name: formData.get("name"),
  });

  if (!validatedFields.success) {
    const errors = Object.entries(validatedFields.error.flatten().fieldErrors)
      .map(([f, m]) => `${f}: ${(m ?? []).join(",")}`)
      .join("; ");
    return { success: false, error: `Datos inválidos: ${errors}` };
  }

  const { name } = validatedFields.data;
  const normalizedName = name.trim();

  try {
    const maxOrderResult = await prisma.branch.aggregate({ // CAMBIADO
      _max: { order: true },
      where: { organizationId },
    });
    const nextOrder = (maxOrderResult._max.order ?? -1) + 1;

    const newBranch = await prisma.branch.create({ // CAMBIADO
      data: {
        name: normalizedName,
        order: nextOrder,
        organizationId: organizationId,
      },
    });

    revalidatePath("/configuration"); // CAMBIADO A RUTA CORRECTA
    return { success: true, branch: newBranch }; // CAMBIADO
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (createBranch):", error); // CAMBIADO
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        success: false,
        error: `La sucursal \"${normalizedName}\" ya existe en tu organización.`,
      };
    }
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return { success: false, error: `Error al crear la sucursal: ${message}` };
  }
}

// --- Acción: updateBranch ---
export interface UpdateBranchState { // CAMBIADO
  success: boolean;
  error?: string | null;
  branch?: Branch | null; // CAMBIADO y tipo Branch
}

export async function updateBranch( // CAMBIADO
  prevState: UpdateBranchState | null,
  formData: FormData,
): Promise<UpdateBranchState> { // CAMBIADO
  const organizationId = await getOrganizationIdFromSession();
  if (!organizationId)
    return { success: false, error: "Usuario no autenticado o sin organización." };

  const validatedFields = updateBranchSchema.safeParse({
    id: formData.get("id"), // Zod se encarga de convertir a número si es necesario
    name: formData.get("name"),
  });

  if (!validatedFields.success) {
    const errors = Object.entries(validatedFields.error.flatten().fieldErrors)
      .map(([f, m]) => `${f}: ${(m ?? []).join(",")}`)
      .join("; ");
    return { success: false, error: `Datos inválidos: ${errors}` };
  }

  const { id, name } = validatedFields.data;
  const normalizedName = name.trim();

  try {
    const existingBranch = await prisma.branch.findUnique({ where: { id } }); // CAMBIADO
    if (!existingBranch || existingBranch.organizationId !== organizationId) {
      return { success: false, error: "Sucursal no encontrada o no pertenece a tu organización." };
    }

    const updatedBranch = await prisma.branch.update({ // CAMBIADO
      where: { id: id }, 
      data: { name: normalizedName },
    });

    revalidatePath("/configuration"); // CAMBIADO A RUTA CORRECTA
    return { success: true, branch: updatedBranch }; // CAMBIADO
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (updateBranch):", error); // CAMBIADO
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        success: false,
        error: `El nombre de sucursal \"${normalizedName}\" ya existe en tu organización.`,
      };
    }
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return { success: false, error: `Error al actualizar la sucursal: ${message}` };
  }
}

// --- Acción: deleteBranch ---
export interface DeleteBranchState { // CAMBIADO
  success: boolean;
  error?: string | null;
}

export async function deleteBranch( // CAMBIADO
  prevState: DeleteBranchState | null,
  formData: FormData,
): Promise<DeleteBranchState> { // CAMBIADO
  const organizationId = await getOrganizationIdFromSession();
  if (!organizationId)
    return { success: false, error: "Usuario no autenticado o sin organización." };

  const validatedFields = deleteBranchSchema.safeParse({
    id: formData.get("id"), // Zod se encarga de convertir a número
  });

  if (!validatedFields.success) return { success: false, error: "ID de sucursal inválido." };
  const { id } = validatedFields.data;

  try {
    const existingBranch = await prisma.branch.findUnique({ where: { id } }); // CAMBIADO
    if (!existingBranch || existingBranch.organizationId !== organizationId) {
      return { success: false, error: "Sucursal no encontrada o no pertenece a tu organización." };
    }

    await prisma.branch.delete({ where: { id: id } }); // CAMBIADO

    revalidatePath("/configuration"); // CAMBIADO A RUTA CORRECTA
    return { success: true };
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (deleteBranch):", error); // CAMBIADO
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { success: false, error: "La sucursal a eliminar no se encontró." };
    }
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return { success: false, error: `Error al eliminar la sucursal: ${message}` };
  }
}

// --- Acción: updateBranchesOrder ---
export interface UpdateBranchesOrderState { // CAMBIADO
  success: boolean;
  error?: string | null;
}

export async function updateBranchesOrder( // CAMBIADO
  prevState: UpdateBranchesOrderState | null,
  orderedItems: { id: number; order: number }[],
): Promise<UpdateBranchesOrderState> { // CAMBIADO
  const organizationId = await getOrganizationIdFromSession();
  if (!organizationId) 
    return { success: false, error: "Usuario no autenticado o sin organización." };

  // Validación del array de items con Zod (esquema definido en BranchZod.ts)
  const validatedItems = updateBranchOrderSchema.safeParse(orderedItems);

  if (!validatedItems.success) {
    const errors = validatedItems.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join("; ");
    return { success: false, error: `Datos de orden inválidos: ${errors}` };
  }
  
  try {
    // Iniciar una transacción para asegurar atomicidad
    await prisma.$transaction(async (tx) => {
      for (const item of validatedItems.data) {
        // Verificar pertenencia a la organización (opcional pero recomendado si no se confía en el input)
        // const branch = await tx.branch.findUnique({ where: { id: item.id } });
        // if (!branch || branch.organizationId !== organizationId) {
        //   throw new Error(`Branch with id ${item.id} not found or does not belong to the organization.`);
        // }
        await tx.branch.update({
          where: { id: item.id, organizationId: organizationId }, // Asegurar que solo se actualicen los de la org
          data: { order: item.order },
        });
      }
    });

    revalidatePath("/configuration"); // CAMBIADO A RUTA CORRECTA
    return { success: true };
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (updateBranchesOrder):", error); // CAMBIADO
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return { success: false, error: `Error al actualizar el orden: ${message}` };
  }
} 