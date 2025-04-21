"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import {
  associateBrandSchema,
  updateBrandAssociationSchema,
  dissociateBrandSchema,
  updateOrgBrandOrderSchema,
} from "@/zod/BrandZod";
import { getOrganizationIdFromSession } from "../getOrganizationIdFromSession";

// Helper para obtener organizationId de la sesión

// ==============================================
// Acciones para Marcas (Brands) - Modelo N:M
// ==============================================

// --- Acción: associateOrganizationBrand (Reemplaza createOrganizationBrand) ---
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
  const organizationId = await getOrganizationIdFromSession();
  if (!organizationId)
    return { success: false, error: "Usuario no autenticado o sin organización." };

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
  const organizationId = await getOrganizationIdFromSession();
  if (!organizationId)
    return { success: false, error: "Usuario no autenticado o sin organización." };

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
  const organizationId = await getOrganizationIdFromSession();
  if (!organizationId)
    return { success: false, error: "Usuario no autenticado o sin organización." };

  const validatedFields = dissociateBrandSchema.safeParse({
    organizationBrandId: formData.get("organizationBrandId"),
  });

  if (!validatedFields.success) return { success: false, error: "ID de asociación inválido." };
  const { organizationBrandId } = validatedFields.data;

  try {
    // Verificar que la asociación pertenece a la organización actual
    const associationToDelete = await prisma.organizationBrand.findUnique({
      where: { id: organizationBrandId },
    });
    if (!associationToDelete || associationToDelete.organizationId !== organizationId) {
      return {
        success: false,
        error: "Asociación no encontrada o no pertenece a tu organización.",
      };
    }

    // Borrar solo la entrada en OrganizationBrand
    await prisma.organizationBrand.delete({ where: { id: organizationBrandId } });

    revalidatePath("/configuracion");
    return { success: true };
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (dissociateOrganizationBrand):", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { success: false, error: "La asociación a eliminar no se encontró." };
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
  const organizationId = await getOrganizationIdFromSession();
  if (!organizationId)
    return { success: false, error: "Usuario no autenticado o sin organización." };

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
  const organizationId = await getOrganizationIdFromSession();
  if (!organizationId)
    return { success: false, error: "Usuario no autenticado o sin organización." };

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
  const organizationId = await getOrganizationIdFromSession();
  if (!organizationId)
    return { success: false, error: "Usuario no autenticado o sin organización." };

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
  const organizationId = await getOrganizationIdFromSession();
  if (!organizationId)
    return { success: false, error: "Usuario no autenticado o sin organización." };

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
      let newModel = await tx.model.findUnique({
        where: { name_brandId: { name: normalizedNewName, brandId } },
      });
      let newModelCreated = false;
      if (!newModel) {
        newModel = await tx.model.create({
          data: { name: normalizedNewName, brandId: brandId },
        });
        newModelCreated = true;
        console.log(`[replaceModel N:M] Nuevo modelo global CREADO: ID ${newModel.id}`);
      } else {
        console.log(`[replaceModel N:M] Nuevo modelo global ENCONTRADO: ID ${newModel.id}`);
      }
      const newModelId = newModel.id;

      // 4. Verificar que no se esté renombrando a sí mismo
      if (newModelId === oldModelId) {
        throw new Error("El nuevo nombre es igual al nombre actual.");
      }

      // 5. Gestionar la configuración del NUEVO modelo para esta organización (Upsert-like manual)
      let newOrgModelConfigId: number;
      const existingNewConfig = await tx.organizationModelConfig.findUnique({
        where: { organizationId_modelId: { organizationId, modelId: newModelId } },
      });

      if (existingNewConfig) {
        console.log(
          `[replaceModel N:M] Config para NUEVO modelo encontrada: ID ${existingNewConfig.id}, Visible ${existingNewConfig.isVisible}`,
        );
        if (existingNewConfig.isVisible) {
          throw new Error(
            `El modelo "${normalizedNewName}" ya está activo para esta marca en tu organización.`,
          );
        }
        // Reactivar la config existente del nuevo modelo
        const updatedConfig = await tx.organizationModelConfig.update({
          where: { id: existingNewConfig.id },
          data: { isVisible: true, order: originalOrder }, // Establecer visibilidad y orden
        });
        newOrgModelConfigId = updatedConfig.id;
        console.log(
          `[replaceModel N:M] Config para NUEVO modelo REACTIVADA: ID ${newOrgModelConfigId}`,
        );
      } else {
        // Crear la config para el nuevo modelo
        const createdConfig = await tx.organizationModelConfig.create({
          data: {
            organizationId: organizationId,
            modelId: newModelId,
            isVisible: true,
            order: originalOrder, // Usar el orden del modelo antiguo
          },
        });
        newOrgModelConfigId = createdConfig.id;
        console.log(
          `[replaceModel N:M] Config para NUEVO modelo CREADA: ID ${newOrgModelConfigId}`,
        );
      }

      // 6. Ocultar la configuración ANTIGUA
      console.log(`[replaceModel N:M] Ocultando config ANTIGUA: ID ${oldConfig.id}`);
      await tx.organizationModelConfig.update({
        where: { id: oldConfig.id },
        data: { isVisible: false },
      });
      console.log("[replaceModel N:M] Config ANTIGUA oculta.");

      return { newOrgModelConfigId, oldModelName, newModelCreated };
    }); // Fin transacción

    console.log("[replaceModel N:M] Transacción completada. Revalidando path...");
    revalidatePath("/configuracion");

    const message = `Modelo "${result.oldModelName}" reemplazado por "${normalizedNewName}"${result.newModelCreated ? " (nuevo modelo global creado)" : ""} en tu organización.`;
    return {
      success: true,
      newOrgModelConfigId: result.newOrgModelConfigId,
      message: message,
    };
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (replaceModel N:M):", error);
    const message = error instanceof Error ? error.message : "Error inesperado.";
    // Devolver mensajes de error específicos de la transacción
    if (
      message.includes("ya está activo") ||
      message.includes("igual al nombre actual") ||
      message.includes("modelo que ya está oculto")
    ) {
      return { success: false, error: message };
    }
    return { success: false, error: `Error al reemplazar el modelo: ${message}` };
  }
}

// --- (NUEVA ACCIÓN) Acción para establecer visibilidad de un Modelo para una Organización ---
export interface SetModelVisibilityState {
  success: boolean;
  error?: string | null;
}

const setModelVisibilitySchema = z.object({
  modelId: z.coerce.number().int(),
  isVisible: z.boolean(),
  // organizationId se obtiene de sesión
});

export async function setOrganizationModelVisibility(
  prevState: SetModelVisibilityState | null,
  formData: FormData,
): Promise<SetModelVisibilityState> {
  const organizationId = await getOrganizationIdFromSession();
  if (!organizationId)
    return { success: false, error: "Usuario no autenticado o sin organización." };

  const validatedFields = setModelVisibilitySchema.safeParse({
    modelId: formData.get("modelId"),
    // Convertir string 'true' a boolean. Cualquier otra cosa (incluyendo null o 'false') será false.
    isVisible: formData.get("isVisible") === "true",
  });

  if (!validatedFields.success) {
    const errors = Object.entries(validatedFields.error.flatten().fieldErrors)
      .map(([f, m]) => `${f}: ${(m ?? []).join(",")}`)
      .join("; ");
    return { success: false, error: `Datos inválidos: ${errors}` };
  }

  const { modelId, isVisible } = validatedFields.data;

  console.log(`[setVisibility] Org: ${organizationId}, Model: ${modelId}, Visible: ${isVisible}`); // LOG

  try {
    // 1. Verificar que el modelo existe (y obtener brandId para permiso)
    const model = await prisma.model.findUnique({
      where: { id: modelId },
      select: { brandId: true },
    });
    if (!model) return { success: false, error: "Modelo no encontrado." };

    // 2. Verificar permiso de la org sobre la marca del modelo
    const hasPermission = await checkBrandPermission(organizationId, model.brandId);
    if (!hasPermission)
      return { success: false, error: "No tienes permiso para modificar modelos de esta marca." };

    // 3. Usar upsert: si existe la config, actualiza isVisible; si no, la crea.
    await prisma.organizationModelConfig.upsert({
      where: {
        organizationId_modelId: { organizationId, modelId },
      },
      update: {
        // Qué actualizar si existe
        isVisible: isVisible,
      },
      create: {
        // Qué crear si no existe
        organizationId: organizationId,
        modelId: modelId,
        isVisible: isVisible,
        // Calcular orden si se crea? Podría ser complejo, mejor dejar en 0 o max+1
        // Por ahora, dejaremos el order por defecto (0) si se crea aquí.
        // Idealmente, la config se crea cuando se añade el modelo.
        order: 0,
      },
    });

    revalidatePath("/configuracion");
    return { success: true };
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (setVisibility):", error);
    return { success: false, error: "Error al actualizar la visibilidad del modelo." };
  }
}

// --- Acción: updateOrganizationModelsOrder (Actualiza orden en OrganizationModelConfig) ---
export interface UpdateModelOrderState {
  success: boolean;
  error?: string | null;
}

export async function updateOrganizationModelsOrder(
  prevState: UpdateModelOrderState | null,
  data: { modelOrders: { modelId: number; order: number }[]; brandId: number },
): Promise<UpdateModelOrderState> {
  const organizationId = await getOrganizationIdFromSession();
  if (!organizationId)
    return { success: false, error: "Usuario no autenticado o sin organización." };

  console.log("[updateOrgModelsOrder] Received data:", JSON.stringify(data)); // LOG DATOS RECIBIDOS

  // Validar payload
  const validatedData = updateModelOrgOrderSchema.safeParse(data);
  if (!validatedData.success) {
    const errors =
      validatedData.error.flatten().formErrors.join("; ") || "Invalid order data provided.";
    console.error("[updateOrgModelsOrder] Validation Error:", errors); // LOG ERROR VALIDACIÓN
    return { success: false, error: `Datos de orden inválidos: ${errors}` };
  }

  const { modelOrders, brandId } = validatedData.data;
  console.log(
    `[updateOrgModelsOrder] Validated - OrgId: ${organizationId}, BrandId: ${brandId}, ModelOrders:`,
    modelOrders,
  ); // LOG DATOS VALIDADOS

  try {
    // 1. Verificar permiso de la org sobre la marca
    const hasPermission = await checkBrandPermission(organizationId, brandId);
    if (!hasPermission) {
      console.error(
        `[updateOrgModelsOrder] Permission Denied: Org ${organizationId} for Brand ${brandId}`,
      ); // LOG ERROR PERMISO
      return { success: false, error: "No tienes permiso para reordenar modelos de esta marca." };
    }

    // 2. Verificar que todos los modelos pertenezcan a esta marca global
    const modelIds = modelOrders.map((m) => m.modelId);
    const existingModels = await prisma.model.findMany({
      where: { id: { in: modelIds }, brandId: brandId },
      select: { id: true },
    });
    if (existingModels.length !== modelIds.length) {
      console.error(
        `[updateOrgModelsOrder] Model Mismatch: Found ${existingModels.length}/${modelIds.length} models for Brand ${brandId}`,
      ); // LOG ERROR MODELOS
      return {
        success: false,
        error: "Error: Uno o más modelos no pertenecen a la marca especificada.",
      };
    }

    // 3. Ejecutar actualizaciones en transacción sobre OrganizationModelConfig
    console.log("[updateOrgModelsOrder] Preparing updates..."); // LOG ANTES DE MAP
    const updates = modelOrders.map((item) => {
      console.log(
        ` -> Updating OrgModelConfig: OrgId=${organizationId}, ModelId=${item.modelId} to Order=${item.order}`,
      ); // LOG CADA UPDATE
      return prisma.organizationModelConfig.updateMany({
        where: {
          organizationId: organizationId,
          modelId: item.modelId,
        },
        data: { order: item.order },
      });
    });

    console.log("[updateOrgModelsOrder] Executing transaction..."); // LOG ANTES DE TRANSACCIÓN
    const transactionResult = await prisma.$transaction(updates);
    console.log("[updateOrgModelsOrder] Transaction Result:", transactionResult); // LOG RESULTADO TRANSACCIÓN

    const updatedCount = transactionResult.reduce((sum, result) => sum + result.count, 0);
    console.log(
      `[updateOrgModelsOrder] Total records updated: ${updatedCount} (Expected: ${modelOrders.length})`,
    ); // LOG CONTEO
    if (updatedCount !== modelOrders.length) {
      console.warn("[updateOrgModelsOrder] Update count mismatch!");
    }

    console.log("[updateOrgModelsOrder] Revalidating path..."); // LOG REVALIDATE
    revalidatePath("/configuracion");
    return { success: true };
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (updateModelOrder OrgConfig):", error); // LOG ERROR GENERAL
    return { success: false, error: "Error al actualizar el orden de los modelos." };
  }
}

// --- (NUEVA ACCIÓN) Acción para desasociar (ocultar) un Modelo para una Organización ---
export interface DissociateModelState {
  success: boolean;
  error?: string | null;
  message?: string | null;
}

const dissociateModelSchema = z.object({
  modelId: z.coerce.number().int("ID de modelo inválido."),
  // organizationId se obtiene de sesión
});

export async function dissociateOrganizationModel(
  prevState: DissociateModelState | null,
  formData: FormData,
): Promise<DissociateModelState> {
  const organizationId = await getOrganizationIdFromSession();
  if (!organizationId)
    return { success: false, error: "Usuario no autenticado o sin organización." };

  const validatedFields = dissociateModelSchema.safeParse({
    modelId: formData.get("modelId"),
  });

  if (!validatedFields.success) {
    const errors = Object.entries(validatedFields.error.flatten().fieldErrors)
      .map(([f, m]) => `${f}: ${(m ?? []).join(",")}`)
      .join("; ");
    return { success: false, error: `Datos inválidos: ${errors}` };
  }

  const { modelId } = validatedFields.data;

  console.log(`[dissociateModel] Org: ${organizationId}, Model: ${modelId}`); // LOG

  try {
    // 1. Verificar que el modelo existe y obtener brandId
    const model = await prisma.model.findUnique({
      where: { id: modelId },
      select: { brandId: true, name: true },
    });
    if (!model) return { success: false, error: "Modelo no encontrado." };

    // 2. Verificar permiso de la org sobre la marca del modelo
    const hasPermission = await checkBrandPermission(organizationId, model.brandId);
    if (!hasPermission)
      return { success: false, error: "No tienes permiso para modificar modelos de esta marca." };

    // 3. Actualizar la config existente para marcar como no visible
    const updateResult = await prisma.organizationModelConfig.updateMany({
      where: {
        organizationId: organizationId,
        modelId: modelId,
        // Opcional: asegurar que solo se oculte si estaba visible
        // isVisible: true
      },
      data: {
        isVisible: false,
      },
    });

    if (updateResult.count === 0) {
      console.warn(
        `[dissociateModel] No config found or already invisible for Org: ${organizationId}, Model: ${modelId}`,
      );
      // Considerar si esto es un error o un éxito silencioso
      // Por ahora, lo trataremos como éxito ya que el estado deseado (invisible) se cumple
      // return { success: false, error: "Configuración del modelo no encontrada o ya estaba oculta." };
    }

    revalidatePath("/configuracion");
    return { success: true, message: `Modelo "${model.name}" ocultado para tu organización.` };
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (dissociateModel):", error);
    return { success: false, error: "Error al ocultar el modelo." };
  }
}
