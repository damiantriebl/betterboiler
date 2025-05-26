"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import type { ActionState, BatchActionState } from "@/types/action-states";
import {
  associateBrandSchema,
  dissociateBrandSchema,
  updateBrandAssociationSchema,
  updateOrgBrandOrderSchema,
} from "@/zod/BrandZod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getOrganizationIdFromSession } from "../util";

export interface AssociateBrandState {
  success: boolean;
  error?: string | null;
  organizationBrandId?: number | null;
  message?: string | null;
}

export async function associateOrganizationBrand(
  prevState: AssociateBrandState | null,
  formData: FormData,
): Promise<AssociateBrandState> {
  const org = await getOrganizationIdFromSession();
  if (!org.organizationId)
    return { success: false, error: "Usuario no autenticado o sin organización." };

  const organizationId = org.organizationId;

  const validatedFields = associateBrandSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color") || null,
  });

  if (!validatedFields.success) {
    const fieldErrors = validatedFields.error.flatten().fieldErrors;
    const errors =
      Object.keys(fieldErrors).length > 0
        ? Object.entries(fieldErrors)
            .map(([f, m]: [string, string[] | undefined]) => `${f}: ${(m ?? []).join(",")}`)
            .join("; ")
        : "Validation failed, check inputs.";
    return { success: false, error: `Datos inválidos: ${errors}` };
  }

  const { name, color } = validatedFields.data;
  const normalizedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

  try {
    // Usar transacción para buscar/crear Brand y luego crear OrganizationBrand
    const result = await prisma.$transaction(async (tx) => {
      // 1. Buscar o crear la Marca global
      let brand = await tx.brand.findUnique({ where: { name: normalizedName } });
      let brandCreated = false;
      if (!brand) {
        brand = await tx.brand.create({ data: { name: normalizedName } });
        brandCreated = true;
      }
      const brandId = brand.id;

      // 2. Verificar si ya existe la asociación para esta organización
      const existingAssociation = await tx.organizationBrand.findUnique({
        where: { organizationId_brandId: { organizationId, brandId } },
      });
      if (existingAssociation) {
        // Si ya existe, podríamos retornar un mensaje o actualizar el color/orden si se pasaron
        return {
          alreadyExists: true,
          organizationBrandId: existingAssociation.id,
          brandName: brand.name,
        };
      }

      // 3. Calcular orden para esta asociación DENTRO de la organización
      const maxOrderResult = await tx.organizationBrand.aggregate({
        _max: { order: true },
        where: { organizationId },
      });
      const nextOrder = (maxOrderResult._max.order ?? -1) + 1;

      // 4. Crear la entrada en OrganizationBrand
      const newAssociation = await tx.organizationBrand.create({
        data: {
          organizationId,
          brandId,
          order: nextOrder,
          color: color,
        },
      });

      return {
        alreadyExists: false,
        organizationBrandId: newAssociation.id,
        brandName: brand.name,
        brandCreated,
      };
    }); // Fin transacción

    if (result.alreadyExists) {
      return {
        success: true, // Consideramos éxito si ya existía
        organizationBrandId: result.organizationBrandId,
        message: `La marca "${result.brandName}" ya estaba asociada a tu organización.`,
      };
    }

    revalidatePath("/configuracion");
    return {
      success: true,
      organizationBrandId: result.organizationBrandId,
      message: `Marca "${result.brandName}" ${result.brandCreated ? "creada globalmente y " : ""}asociada a tu organización.`,
    };
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (associateOrganizationBrand):", error);
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return { success: false, error: `Error al asociar la marca: ${message}` };
  }
}

// --- Acción: updateOrganizationBrandAssociation (Reemplaza updateOrganizationBrand) ---
export interface UpdateAssociationState {
  success: boolean;
  error?: string | null;
}

export async function updateOrganizationBrandAssociation(
  prevState: UpdateAssociationState | null,
  formData: FormData,
): Promise<UpdateAssociationState> {
  const org = await getOrganizationIdFromSession();
  if (!org.organizationId)
    return { success: false, error: "Usuario no autenticado o sin organización." };

  const organizationId = org.organizationId;

  const validatedFields = updateBrandAssociationSchema.safeParse({
    organizationBrandId: formData.get("organizationBrandId"),
    color: formData.get("color"), // Puede ser null si no se cambia
    order: formData.get("order"), // Puede ser null si no se cambia
  });

  if (!validatedFields.success) {
    const fieldErrors = validatedFields.error.flatten().fieldErrors;
    const errors =
      Object.keys(fieldErrors).length > 0
        ? Object.entries(fieldErrors)
            .map(([f, m]: [string, string[] | undefined]) => `${f}: ${(m ?? []).join(",")}`)
            .join("; ")
        : "Validation failed, check inputs.";
    return { success: false, error: `Datos inválidos: ${errors}` };
  }

  const { organizationBrandId, color, order } = validatedFields.data;
  const dataToUpdate: { color?: string | null; order?: number } = {};
  if (color !== undefined) dataToUpdate.color = color;
  if (order !== undefined) dataToUpdate.order = order;

  try {
    // Verificar que la asociación pertenece a la organización actual
    const association = await prisma.organizationBrand.findUnique({
      where: { id: organizationBrandId },
    });
    if (!association || association.organizationId !== organizationId) {
      return {
        success: false,
        error: "Asociación no encontrada o no pertenece a tu organización.",
      };
    }

    await prisma.organizationBrand.update({
      where: { id: organizationBrandId },
      data: dataToUpdate,
    });

    revalidatePath("/configuracion");
    return { success: true };
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (updateOrganizationBrandAssociation):", error);
    return { success: false, error: "Error al actualizar la asociación." };
  }
}

// --- Acción: dissociateOrganizationBrand (Reemplaza deleteOrganizationBrand) ---
export interface DissociateBrandState {
  success: boolean;
  error?: string | null;
}

export async function dissociateOrganizationBrand(
  prevState: DissociateBrandState | null,
  formData: FormData,
): Promise<DissociateBrandState> {
  const org = await getOrganizationIdFromSession();
  if (!org.organizationId)
    return { success: false, error: "Usuario no autenticado o sin organización." };

  const organizationId = org.organizationId;

  const validatedFields = dissociateBrandSchema.safeParse({
    organizationBrandId: formData.get("organizationBrandId"),
  });

  if (!validatedFields.success) return { success: false, error: "ID de asociación inválido." };
  const { organizationBrandId } = validatedFields.data;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Verificar que la asociación pertenece a la organización actual y obtener brandId
      const associationToDelete = await tx.organizationBrand.findUnique({
        where: { id: organizationBrandId },
        select: { organizationId: true, brandId: true }, // Seleccionar brandId también
      });

      if (!associationToDelete || associationToDelete.organizationId !== organizationId) {
        // Lanzar un error para abortar la transacción si no se encuentra o no pertenece
        throw new Error("Asociación no encontrada o no pertenece a tu organización.");
      }

      const brandIdToDeleteConfigs = associationToDelete.brandId;

      // 2. Eliminar las OrganizationModelConfig asociadas a esta organización y marca
      await tx.organizationModelConfig.deleteMany({
        where: {
          organizationId: organizationId,
          model: {
            brandId: brandIdToDeleteConfigs,
          },
        },
      });

      // 3. Borrar la entrada en OrganizationBrand
      await tx.organizationBrand.delete({ where: { id: organizationBrandId } });
    });

    revalidatePath("/configuration"); // Estandarizar ruta
    return { success: true }; // Eliminado message para cumplir con DissociateBrandState
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (dissociateOrganizationBrand):", error);
    // Si el error es el que lanzamos arriba, usar su mensaje
    if (
      error instanceof Error &&
      error.message === "Asociación no encontrada o no pertenece a tu organización."
    ) {
      return { success: false, error: error.message };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      // Este error podría ocurrir si organizationBrand.delete falla porque ya no existe
      return { success: false, error: "La asociación a eliminar no se encontró (P2025)." };
    }
    return { success: false, error: "Error al desasociar la marca." };
  }
}

// --- Acción: updateOrganizationBrandsOrder (Lógica similar, pero actualiza OrganizationBrand) ---
export interface UpdateBrandOrderState {
  success: boolean;
  error?: string | null;
}

export async function updateOrganizationBrandsOrder(
  prevState: UpdateBrandOrderState | null,
  orderedAssociations: { id: number; order: number }[],
): Promise<UpdateBrandOrderState> {
  const org = await getOrganizationIdFromSession();
  if (!org.organizationId)
    return { success: false, error: "Usuario no autenticado o sin organización." };

  const organizationId = org.organizationId;

  const validationResult = updateOrgBrandOrderSchema.safeParse(orderedAssociations);
  if (!validationResult.success) {
    const errors =
      validationResult.error.flatten().formErrors.join("; ") || "Invalid order data provided.";
    return { success: false, error: `Datos de orden inválidos: ${errors}` };
  }

  try {
    // Verificar que todas las asociaciones (IDs de OrganizationBrand) pertenezcan a esta organización
    const associationIds = validationResult.data.map((a: { id: number; order: number }) => a.id);
    const existingAssociations = await prisma.organizationBrand.findMany({
      where: { id: { in: associationIds }, organizationId: organizationId },
      select: { id: true },
    });
    if (existingAssociations.length !== associationIds.length) {
      return {
        success: false,
        error: "Error: Una o más asociaciones no pertenecen a tu organización.",
      };
    }

    // Ejecutar actualizaciones en transacción
    const updates = validationResult.data.map((item: { id: number; order: number }) =>
      prisma.organizationBrand.update({
        where: { id: item.id },
        data: { order: item.order },
      }),
    );
    await prisma.$transaction(updates);

    revalidatePath("/configuracion");
    return { success: true };
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (updateOrganizationBrandsOrder):", error);
    return { success: false, error: "Error al actualizar el orden de las marcas." };
  }
}

// --- Acción: renameBrandByDuplication (Adaptada para N:M) ---
export interface RenameBrandState {
  success: boolean;
  error?: string | null;
  newOrganizationBrandId?: number | null;
  message?: string | null;
}

const renameBrandNMschema = z.object({
  oldOrganizationBrandId: z.coerce.number().int(), // ID de la asociación a reemplazar
  newBrandName: z.string().min(1, "El nuevo nombre es requerido."),
  // organizationId se obtiene de sesión
});

export async function renameBrandByDuplication(
  prevState: RenameBrandState | null,
  formData: FormData,
): Promise<RenameBrandState> {
  const org = await getOrganizationIdFromSession();
  if (!org.organizationId)
    return { success: false, error: "Usuario no autenticado o sin organización." };

  const organizationId = org.organizationId;

  const validatedFields = renameBrandNMschema.safeParse({
    oldOrganizationBrandId: formData.get("oldOrganizationBrandId"),
    newBrandName: formData.get("newBrandName"),
  });

  if (!validatedFields.success) {
    const errors = Object.entries(validatedFields.error.flatten().fieldErrors)
      .map(([f, m]) => `${f}: ${(m ?? []).join(",")}`)
      .join("; ");
    return { success: false, error: `Datos inválidos: ${errors}` };
  }

  const { oldOrganizationBrandId, newBrandName } = validatedFields.data;
  const normalizedNewName =
    newBrandName.charAt(0).toUpperCase() + newBrandName.slice(1).toLowerCase();

  console.log(
    `[renameBrandByDuplication N:M] Iniciando para oldAssocId: ${oldOrganizationBrandId}, newBrandName: "${normalizedNewName}", orgId: ${organizationId}`,
  );

  try {
    const result = await prisma.$transaction(async (tx) => {
      console.log(
        `[renameBrandByDuplication N:M] Dentro de transacción para oldAssocId: ${oldOrganizationBrandId}`,
      );

      // 1. Verificar asociación original y obtener datos
      const oldAssociation = await tx.organizationBrand.findUnique({
        where: { id: oldOrganizationBrandId },
        include: { brand: true }, // Incluir la marca original
      });
      if (!oldAssociation || oldAssociation.organizationId !== organizationId) {
        throw new Error("Asociación original no encontrada o no pertenece a tu organización.");
      }
      const oldBrandName = oldAssociation.brand.name;

      // 2. Buscar o crear la NUEVA marca global
      let newBrand = await tx.brand.findUnique({ where: { name: normalizedNewName } });
      if (!newBrand) {
        newBrand = await tx.brand.create({ data: { name: normalizedNewName } });
        console.log(
          `[renameBrandByDuplication N:M] Nueva marca global creada: ID ${newBrand.id}, Nombre ${newBrand.name}`,
        );
      } else {
        console.log(
          `[renameBrandByDuplication N:M] Marca global encontrada: ID ${newBrand.id}, Nombre ${newBrand.name}`,
        );
        // Verificar que esta nueva marca no esté ya asociada a ESTA organización
        const checkExisting = await tx.organizationBrand.findUnique({
          where: { organizationId_brandId: { organizationId, brandId: newBrand.id } },
        });
        if (checkExisting) {
          throw new Error(`La marca "${normalizedNewName}" ya está asociada a tu organización.`);
        }
      }
      const newBrandId = newBrand.id;

      // 3. Crear la NUEVA asociación en OrganizationBrand (usando orden y color antiguos)
      const newAssociation = await tx.organizationBrand.create({
        data: {
          organizationId: organizationId,
          brandId: newBrandId,
          order: oldAssociation.order, // Mantener el orden relativo
          color: oldAssociation.color, // Mantener el color personalizado
        },
      });
      console.log(
        `[renameBrandByDuplication N:M] Nueva asociación creada: ID ${newAssociation.id} (Org: ${organizationId}, Brand: ${newBrandId})`,
      );

      // 4. Eliminar la ANTIGUA asociación de OrganizationBrand
      console.log(
        `[renameBrandByDuplication N:M] Eliminando antigua asociación ID: ${oldOrganizationBrandId}`,
      );
      await tx.organizationBrand.delete({ where: { id: oldOrganizationBrandId } });
      console.log("[renameBrandByDuplication N:M] Antigua asociación eliminada.");

      // **NO se copian modelos**, pertenecen a la Brand global

      return { newAssociationId: newAssociation.id, oldBrandName: oldBrandName };
    });

    console.log("[renameBrandByDuplication N:M] Transacción completada. Revalidando path...");
    revalidatePath("/configuracion");
    return {
      success: true,
      newOrganizationBrandId: result.newAssociationId,
      message: `Marca "${result.oldBrandName}" reemplazada por "${normalizedNewName}" en tu organización.`,
    };
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (renameBrandByDuplication N:M):", error);
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return { success: false, error: `Error al reemplazar la marca: ${message}` };
  }
}

// ==============================================
// Acciones para Modelos (Models) - Modelo N:M con Configuración por Org
// ==============================================

// --- Esquemas Zod para Models ---
const modelBaseSchema = z.object({
  name: z.string().min(1, "El nombre del modelo es requerido."),
  brandId: z.coerce.number().int("ID de marca inválido."),
});

const createModelSchema = modelBaseSchema;
const updateModelSchema = modelBaseSchema.extend({ id: z.coerce.number().int() });
const deleteModelSchema = z.object({ id: z.coerce.number().int() });

// Esquema para actualizar el orden en OrganizationModelConfig
const updateModelOrgOrderSchema = z.object({
  // Array de { modelId, order } para una marca específica
  modelOrders: z.array(
    z.object({
      modelId: z.number().int(),
      order: z.number().int().min(0),
    }),
  ),
  brandId: z.coerce.number().int(),
});

// Helper para verificar permiso de la organización sobre una marca
async function checkBrandPermission(organizationId: string, brandId: number): Promise<boolean> {
  const association = await prisma.organizationBrand.findUnique({
    where: { organizationId_brandId: { organizationId, brandId } },
    select: { id: true }, // Solo necesitamos saber si existe
  });
  return !!association;
}

// --- Acción: addModelToOrganizationBrand (Adaptada para crear/reactivar OrgModelConfig) ---
export interface CreateModelState {
  success: boolean;
  error?: string | null;
  modelId?: number | null;
  orgModelConfigId?: number | null;
  message?: string | null;
}

export async function addModelToOrganizationBrand(
  prevState: CreateModelState | null,
  formData: FormData,
): Promise<CreateModelState> {
  const org = await getOrganizationIdFromSession();
  if (!org.organizationId) {
    return {
      success: false,
      error: org.error || "Usuario no autenticado o sin organización.",
    };
  }
  const organizationId = org.organizationId;

  const validatedFields = createModelSchema.safeParse({
    name: formData.get("name"),
    brandId: formData.get("brandId"),
  });

  if (!validatedFields.success) {
    const errors = Object.entries(validatedFields.error.flatten().fieldErrors)
      .map(([f, m]) => `${f}: ${(m ?? []).join(",")}`)
      .join("; ");
    return { success: false, error: `Datos inválidos: ${errors}` };
  }

  const { name, brandId } = validatedFields.data;
  const normalizedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

  try {
    // 1. Verificar permiso de la org sobre la Marca
    const hasPermission = await checkBrandPermission(organizationId, brandId);
    if (!hasPermission)
      return { success: false, error: "No tienes permiso para añadir modelos a esta marca." };

    // Usar transacción para buscar/crear/reactivar Model y OrganizationModelConfig
    const result = await prisma.$transaction(async (tx) => {
      // 2. Buscar el Modelo global por nombre y marca
      const existingModel = await tx.model.findUnique({
        where: { name_brandId: { name: normalizedName, brandId } },
      });

      if (existingModel) {
        // El modelo global EXISTE
        const modelId = existingModel.id;

        // 3. Buscar la configuración específica para esta organización
        const existingConfig = await tx.organizationModelConfig.findUnique({
          where: { organizationId_modelId: { organizationId, modelId } },
        });

        if (existingConfig) {
          // La configuración EXISTE
          if (existingConfig.isVisible) {
            // Ya está visible, lanzar error
            throw new Error(
              `El modelo "${normalizedName}" ya está activo para esta marca en tu organización.`,
            );
          }
          // Estaba oculto, ¡reactivarlo!
          const updatedConfig = await tx.organizationModelConfig.update({
            where: { id: existingConfig.id },
            data: { isVisible: true },
          });
          return {
            modelId: modelId,
            orgModelConfigId: updatedConfig.id,
            reactivated: true,
            configCreated: false,
            modelCreated: false,
            brandName: existingModel.name,
          }; // Añadir brandName para mensajes
        }
        // El modelo global existe, pero NO hay config para esta org. ¡Crear la config!
        const maxOrderResult = await tx.organizationModelConfig.aggregate({
          _max: { order: true },
          where: {
            organizationId: organizationId,
            model: { brandId: brandId }, // Corregido: usar brandId directamente
          },
        });
        const nextOrder = (maxOrderResult._max.order ?? -1) + 1;

        const newOrgModelConfig = await tx.organizationModelConfig.create({
          data: {
            organizationId: organizationId,
            modelId: modelId,
            order: nextOrder,
            isVisible: true,
          },
        });
        return {
          modelId: modelId,
          orgModelConfigId: newOrgModelConfig.id,
          reactivated: false,
          configCreated: true,
          modelCreated: false,
          brandName: existingModel.name,
        };
      }
      // El modelo global NO existe, crear modelo Y config
      // 4. Crear modelo global
      const newModel = await tx.model.create({
        data: {
          name: normalizedName,
          brandId: brandId,
        },
      });
      const newModelId = newModel.id;

      // 5. Calcular orden
      const maxOrderResult = await tx.organizationModelConfig.aggregate({
        _max: { order: true },
        where: {
          organizationId: organizationId,
          model: { brandId: brandId }, // Corregido: usar brandId directamente
        },
      });
      const nextOrder = (maxOrderResult._max.order ?? -1) + 1;

      // 6. Crear config
      const newOrgModelConfig = await tx.organizationModelConfig.create({
        data: {
          organizationId: organizationId,
          modelId: newModelId,
          order: nextOrder,
          isVisible: true,
        },
      });

      // Necesitamos el nombre de la marca para el mensaje
      const brand = await tx.brand.findUnique({ where: { id: brandId }, select: { name: true } });

      return {
        modelId: newModelId,
        orgModelConfigId: newOrgModelConfig.id,
        reactivated: false,
        configCreated: false,
        modelCreated: true,
        brandName: brand?.name ?? "",
      };
    }); // Fin transacción

    revalidatePath("/configuracion");

    // Ajustar el mensaje de éxito según el resultado
    let message = `Modelo "${normalizedName}" añadido a la marca "${result.brandName}" con éxito.`;
    if (result.reactivated) {
      message = `Modelo "${normalizedName}" reactivado para la marca "${result.brandName}" en tu organización.`;
    } else if (result.configCreated) {
      message = `Modelo global existente "${normalizedName}" vinculado a la marca "${result.brandName}" en tu organización.`;
    } else if (result.modelCreated) {
      message = `Modelo "${normalizedName}" creado globalmente y vinculado a la marca "${result.brandName}" en tu organización.`;
    }

    return {
      success: true,
      modelId: result.modelId,
      orgModelConfigId: result.orgModelConfigId,
      message: message,
    };
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (addModel N:M + OrgConfig):", error);
    const message = error instanceof Error ? error.message : "Error inesperado.";
    // Devolver el mensaje de error específico si es el caso de "ya activo"
    if (message.startsWith("El modelo") && message.includes("ya está activo")) {
      return { success: false, error: message };
    }
    return { success: false, error: `Error al añadir/reactivar el modelo: ${message}` };
  }
}

// --- Acción: updateOrganizationModel (REEMPLAZADA por lógica de duplicación/reemplazo) ---
export interface UpdateModelState {
  success: boolean;
  error?: string | null;
  newOrgModelConfigId?: number | null;
  message?: string | null;
}

// Mantener schema updateModelSchema para la validación inicial de FormData

export async function updateOrganizationModel(
  prevState: UpdateModelState | null,
  formData: FormData,
): Promise<UpdateModelState> {
  const org = await getOrganizationIdFromSession();
  if (!org.organizationId)
    return { success: false, error: "Usuario no autenticado o sin organización." };

  const organizationId = org.organizationId;

  const validatedFields = updateModelSchema.safeParse({
    id: formData.get("id"), // ID del modelo ANTIGUO a reemplazar
    name: formData.get("name"), // NUEVO nombre deseado
    brandId: formData.get("brandId"), // Marca a la que pertenecen
  });

  if (!validatedFields.success) {
    const errors = Object.entries(validatedFields.error.flatten().fieldErrors)
      .map(([f, m]) => `${f}: ${(m ?? []).join(",")}`)
      .join("; ");
    return { success: false, error: `Datos inválidos: ${errors}` };
  }

  const { id: oldModelId, name: newName, brandId } = validatedFields.data;
  const normalizedNewName = newName.charAt(0).toUpperCase() + newName.slice(1).toLowerCase();

  console.log(
    `[replaceModel N:M] Iniciando para oldModelId: ${oldModelId}, newName: "${normalizedNewName}", brandId: ${brandId}, orgId: ${organizationId}`,
  );

  try {
    const result = await prisma.$transaction(async (tx) => {
      console.log("[replaceModel N:M] Dentro de transacción...");

      // 1. Verificar permiso de la org sobre la Marca
      const hasPermission = await checkBrandPermission(organizationId, brandId);
      if (!hasPermission)
        throw new Error("No tienes permiso para modificar modelos de esta marca.");
      console.log("[replaceModel N:M] Permiso verificado.");

      // 2. Obtener configuración ANTIGUA (para orden y verificar visibilidad)
      const oldConfig = await tx.organizationModelConfig.findUnique({
        where: { organizationId_modelId: { organizationId, modelId: oldModelId } },
        include: { model: { select: { name: true } } }, // Incluir nombre antiguo para mensaje
      });
      if (!oldConfig)
        throw new Error("Configuración del modelo original no encontrada para esta organización.");
      if (!oldConfig.isVisible)
        throw new Error("No se puede renombrar un modelo que ya está oculto.");
      const oldModelName = oldConfig.model.name;
      const originalOrder = oldConfig.order;
      console.log(
        `[replaceModel N:M] Config antigua encontrada: ID ${oldConfig.id}, Order ${originalOrder}, Visible ${oldConfig.isVisible}`,
      );

      // 3. Buscar o Crear el NUEVO modelo global
      const newModel = await tx.model.findUnique({ where: { id: oldModelId } });
      if (!newModel) throw new Error("Modelo original no encontrado para esta organización.");

      // 4. Crear nueva configuración
      const newOrgModelConfig = await tx.organizationModelConfig.create({
        data: {
          organizationId: organizationId,
          modelId: oldModelId,
          order: originalOrder,
          isVisible: true,
        },
      });

      // 5. Actualizar nombre del modelo
      const updatedModel = await tx.model.update({
        where: { id: oldModelId },
        data: { name: normalizedNewName },
      });

      return {
        newOrgModelConfigId: newOrgModelConfig.id,
        message: `Modelo "${oldModelName}" renombrado a "${normalizedNewName}" en tu organización.`,
      };
    });

    revalidatePath("/configuracion");
    return {
      success: true,
      newOrgModelConfigId: result.newOrgModelConfigId,
      message: result.message,
    };
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (updateOrganizationModel):", error);
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return { success: false, error: `Error al actualizar el modelo: ${message}` };
  }
}

export interface UpdateModelsOrderState {
  success: boolean;
  error?: string | null;
}

export async function updateOrganizationModelsOrder(
  prevState: UpdateModelsOrderState | null,
  payload: { brandId: number; modelOrders: { modelId: number; order: number }[] },
): Promise<UpdateModelsOrderState> {
  const org = await getOrganizationIdFromSession();
  if (!org.organizationId)
    return { success: false, error: "Usuario no autenticado o sin organización." };

  const organizationId = org.organizationId;

  const { brandId, modelOrders } = payload;

  try {
    // Verificar que la marca esté asociada a la organización
    const orgBrand = await prisma.organizationBrand.findUnique({
      where: { organizationId_brandId: { organizationId, brandId } },
    });
    if (!orgBrand) {
      return { success: false, error: "Marca no asociada a tu organización." };
    }

    // Actualizar el orden de los modelos en OrganizationModelConfig
    await prisma.$transaction(
      modelOrders.map((item) =>
        prisma.organizationModelConfig.updateMany({
          where: {
            organizationId,
            modelId: item.modelId,
            model: { brandId },
          },
          data: { order: item.order },
        }),
      ),
    );

    revalidatePath("/configuracion");
    return { success: true };
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (updateOrganizationModelsOrder):", error);
    return { success: false, error: "Error al actualizar el orden de los modelos." };
  }
}
