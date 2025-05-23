"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import type { ColorConfig, ColorType } from "@/types/ColorType"; // Necesitamos ColorType
// Importar schemas de color desde el archivo Zod
import {
  createColorSchema,
  deleteColorSchema,
  updateColorActionSchema,
  updateColorsOrderSchema,
} from "@/zod/ColorsZod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getOrganizationIdFromSession } from "../get-Organization-Id-From-Session";

// Definición básica de FormState
type BaseFormState = {
  success: boolean;
  error?: string | null;
};

// Estado específico para la creación exitosa
interface CreateColorSuccessState extends BaseFormState {
  success: true;
  newColor: {
    // Devolver los datos clave del nuevo color
    id: number; // dbId
    name: string;
    type: ColorType;
    colorOne: string;
    colorTwo?: string | null;
    order: number;
  };
}
// Estado específico para la creación fallida
interface CreateColorErrorState extends BaseFormState {
  success: false;
  error: string;
}
// Tipo de estado combinado para createMotoColor
export type CreateColorState = CreateColorSuccessState | CreateColorErrorState;

// Interfaz base para otros estados que no devuelven datos específicos
export type GeneralFormState = BaseFormState;

// ==============================================
// Acciones para Colores (MotoColor) por Organización
// ==============================================

// --- Acción: createMotoColor ---
// Usar el nuevo tipo de estado combinado
export async function createMotoColor(
  prevState: CreateColorState | undefined,
  formData: FormData,
): Promise<CreateColorState> {
  const organizationId = formData.get("organizationId") as string | null;
  if (!organizationId) {
    return { success: false, error: "ID de organización faltante en la solicitud." };
  }

  // Limpiar color2 si es null antes de validar
  const color2Value = formData.get("colorTwo");
  if (color2Value === null) {
    formData.delete("colorTwo");
  }
  console.log("createMotoColor (in action) formData:", Object.fromEntries(formData.entries())); // Log para verificar datos

  // Validar campos, incluyendo organizationId del formData
  const validatedFields = createColorSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    colorOne: formData.get("colorOne"),
    colorTwo: formData.get("colorTwo"),
    organizationId: organizationId, // Usar el ID extraído
  });

  if (!validatedFields.success) {
    const errors = Object.entries(validatedFields.error.flatten().fieldErrors)
      .map(([f, m]) => `${f}: ${(m ?? []).join(",")}`)
      .join("; ");
    console.error("[createMotoColor] Validation Error:", errors);
    return { success: false, error: `Datos inválidos: ${errors}` };
  }

  const { name, type, colorOne, colorTwo } = validatedFields.data;

  try {
    const existing = await prisma.motoColor.findUnique({
      where: { organizationId_name: { organizationId, name } },
    });
    if (existing)
      return {
        success: false,
        error: `El nombre de color "${name}" ya existe en esta organización.`,
      };

    const maxOrderResult = await prisma.motoColor.aggregate({
      _max: { order: true },
      where: { organizationId: organizationId },
    });
    const nextOrder = (maxOrderResult._max.order ?? -1) + 1;

    const newColorDb = await prisma.motoColor.create({
      data: {
        name,
        type,
        colorOne,
        colorTwo: type === "SOLIDO" ? null : colorTwo,
        order: nextOrder,
        organizationId: organizationId, // Usar el ID validado
      },
    });

    // ********** DEVOLVER DATOS DEL NUEVO COLOR **********
    return {
      success: true,
      newColor: {
        id: newColorDb.id,
        name: newColorDb.name,
        type: newColorDb.type as ColorType, // Castear tipo
        colorOne: newColorDb.colorOne,
        colorTwo: newColorDb.colorTwo,
        order: newColorDb.order,
      },
    };
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (createMotoColor):", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return {
        success: false,
        error: "Error de referencia: La organización especificada no existe.",
      };
    }
    return { success: false, error: "Error al crear el color." };
  }
}

// --- Acción: updateMotoColor ---
// Usar GeneralFormState ya que no devuelve datos específicos en éxito
export type UpdateColorActionState = GeneralFormState;

export async function updateMotoColor(
  prevState: UpdateColorActionState | undefined,
  formData: FormData,
): Promise<UpdateColorActionState> {
  // ********** OBTENER organizationId de formData **********
  const organizationId = formData.get("organizationId") as string | null;
  if (!organizationId) {
    return { success: false, error: "ID de organización faltante en la solicitud (update)." };
  }

  // Limpiar color2 si es null
  const color2Value = formData.get("colorTwo");
  if (color2Value === null) {
    formData.delete("colorTwo");
  }

  // Validar campos, incluyendo organizationId del formData
  const validatedFields = updateColorActionSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    type: formData.get("type"),
    colorOne: formData.get("colorOne"),
    colorTwo: formData.get("colorTwo"),
    organizationId: organizationId,
  });

  if (!validatedFields.success) {
    const errors = Object.entries(validatedFields.error.flatten().fieldErrors)
      .map(([f, m]) => `${f}: ${(m ?? []).join(",")}`)
      .join("; ");
    console.error("[updateMotoColor] Validation Error:", errors);
    return { success: false, error: `Datos inválidos: ${errors}` };
  }

  const { id, name, type, colorOne, colorTwo } = validatedFields.data;

  try {
    const colorToUpdate = await prisma.motoColor.findUnique({
      where: { id },
    });

    if (!colorToUpdate) {
      return { success: false, error: "El color a actualizar no se encontró." };
    }

    // Validar pertenencia a la organización
    if (colorToUpdate.organizationId !== organizationId) {
      return { success: false, error: "No tienes permiso para editar este color." };
    }

    // Validar nombre único
    const existingNameColor = await prisma.motoColor.findUnique({
      where: { organizationId_name: { organizationId, name } },
    });
    if (existingNameColor && existingNameColor.id !== id) {
      return {
        success: false,
        error: `El nombre de color "${name}" ya existe en esta organización.`,
      };
    }

    await prisma.motoColor.update({
      where: { id },
      data: {
        name,
        type,
        colorOne,
        colorTwo: type === "SOLIDO" ? null : colorTwo,
      },
    });

    revalidatePath("/configuration");
    return { success: true };
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (updateMotoColor):", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { success: false, error: "El color a actualizar no se encontró." };
    }
    return { success: false, error: "Error al actualizar el color." };
  }
}

// --- Acción: deleteMotoColor ---
// Usar GeneralFormState
export type DeleteColorState = GeneralFormState;

export async function deleteMotoColor(
  prevState: DeleteColorState | undefined,
  formData: FormData,
): Promise<DeleteColorState> {
  // ********** OBTENER organizationId de formData **********
  const organizationId = formData.get("organizationId") as string | null;
  if (!organizationId) {
    return { success: false, error: "ID de organización faltante en la solicitud (delete)." };
  }

  const validatedFields = deleteColorSchema.safeParse({
    id: formData.get("id"),
  });

  if (!validatedFields.success) return { success: false, error: "ID inválido." };
  const { id } = validatedFields.data;

  try {
    const colorToDelete = await prisma.motoColor.findUnique({
      where: { id },
    });

    if (!colorToDelete) {
      return { success: false, error: "El color a eliminar no se encontró." };
    }

    // Validar pertenencia a la organización
    if (colorToDelete.organizationId !== organizationId) {
      return { success: false, error: "No tienes permiso para eliminar este color." };
    }

    await prisma.motoColor.delete({ where: { id } });
    revalidatePath("/configuration");
    return { success: true };
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (deleteMotoColor):", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { success: false, error: "El color a eliminar no se encontró." };
    }
    return { success: false, error: "Error al eliminar el color." };
  }
}

// --- Acción: updateMotoColorsOrder ---
// Usar GeneralFormState
export type UpdateColorsOrderState = GeneralFormState;

export async function updateMotoColorsOrder(
  prevState: UpdateColorsOrderState | undefined,
  payload: { colors: { id: number; order: number }[]; organizationId: string },
): Promise<UpdateColorsOrderState> {
  // Validar organizationId del payload
  if (!payload.organizationId) {
    return { success: false, error: "ID de organización faltante en el payload." };
  }
  const organizationId = payload.organizationId;

  const validatedData = updateColorsOrderSchema.safeParse(payload);
  if (!validatedData.success) {
    const errors = Object.entries(validatedData.error.flatten().fieldErrors)
      .map(([f, m]) => `${f}: ${(m ?? []).join(",")}`)
      .join("; ");
    console.error("[updateMotoColorsOrder] Validation Error:", errors);
    return { success: false, error: `Datos de orden inválidos: ${errors}` };
  }

  const { colors } = validatedData.data;

  try {
    const colorIds = colors.map((c) => c.id);
    const existingColors = await prisma.motoColor.findMany({
      where: {
        id: { in: colorIds },
        organizationId: organizationId,
      },
      select: { id: true },
    });

    if (existingColors.length !== colorIds.length) {
      console.error(
        `[updateMotoColorsOrder] Color mismatch: Found ${existingColors.length}/${colorIds.length} colors for Org ${organizationId}`,
      );
      return { success: false, error: "Error: Uno o más colores no pertenecen a tu organización." };
    }

    const updates = colors.map((item) =>
      prisma.motoColor.update({
        where: { id: item.id, organizationId: organizationId },
        data: { order: item.order },
      }),
    );
    await prisma.$transaction(updates);

    revalidatePath("/configuration");
    return { success: true };
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (updateMotoColorsOrder):", error);
    return { success: false, error: "Error al actualizar el orden de los colores." };
  }
}
