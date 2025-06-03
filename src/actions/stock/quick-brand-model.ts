"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrganizationIdFromSession } from "../util";

// Esquemas de validación
const quickBrandSchema = z.object({
  name: z.string().min(1, "El nombre de la marca es requerido"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color debe ser en formato hexadecimal")
    .optional(),
});

const quickModelSchema = z.object({
  name: z.string().min(1, "El nombre del modelo es requerido"),
  brandId: z.coerce.number().int().positive("ID de marca inválido"),
});

// Nueva interfaz para crear marca + modelo juntos
const quickBrandModelSchema = z.object({
  brandName: z.string().min(1, "El nombre de la marca es requerido"),
  brandColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color debe ser en formato hexadecimal")
    .optional(),
  modelName: z.string().min(1, "El nombre del modelo es requerido"),
  brandId: z.coerce.number().int().positive().optional(), // Si existe la marca globalmente
});

// Interfaces para los resultados
export interface QuickBrandResult {
  success: boolean;
  error?: string;
  brand?: {
    id: number;
    name: string;
    color: string | null;
  };
}

export interface QuickModelResult {
  success: boolean;
  error?: string;
  model?: {
    id: number;
    name: string;
    brandId: number;
  };
}

export interface QuickBrandModelResult {
  success: boolean;
  error?: string;
  brand?: {
    id: number;
    name: string;
    color: string | null;
  };
  model?: {
    id: number;
    name: string;
    brandId: number;
  };
}

/**
 * Busca marcas globales para autocompletado
 */
export async function searchGlobalBrands(
  query: string,
): Promise<{ id: number; name: string; color: string | null }[]> {
  console.log("🔍 Buscando marcas con query:", query);

  try {
    const brands = await prisma.brand.findMany({
      where: {
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
      take: 10,
      orderBy: {
        name: "asc",
      },
    });

    console.log(
      "✅ Marcas encontradas:",
      brands.length,
      brands.map((b) => b.name),
    );
    return brands;
  } catch (error) {
    console.error("❌ Error searching global brands:", error);
    return [];
  }
}

/**
 * Busca modelos globales para una marca específica
 */
export async function searchGlobalModels(
  brandId: number,
  query: string,
): Promise<{ id: number; name: string }[]> {
  console.log("🔍 Buscando modelos con brandId:", brandId, "query:", query);

  try {
    const models = await prisma.model.findMany({
      where: {
        brandId: brandId,
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        name: true,
      },
      take: 10,
      orderBy: {
        name: "asc",
      },
    });

    console.log(
      "✅ Modelos encontrados:",
      models.length,
      models.map((m) => m.name),
    );
    return models;
  } catch (error) {
    console.error("❌ Error searching global models:", error);
    return [];
  }
}

/**
 * Crea una marca local rápida para la organización específica
 * Esta marca NO se agrega al catálogo global, solo existe para esta organización
 */
export async function createQuickLocalBrand(
  prevState: QuickBrandResult | null,
  formData: FormData,
): Promise<QuickBrandResult> {
  const org = await getOrganizationIdFromSession();
  if (!org.organizationId) {
    return {
      success: false,
      error: "Usuario no autenticado o sin organización.",
    };
  }

  const validatedFields = quickBrandSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color") || "#6B7280", // Color gris por defecto
  });

  if (!validatedFields.success) {
    const errors = Object.entries(validatedFields.error.flatten().fieldErrors)
      .map(([field, messages]) => `${field}: ${messages?.join(", ")}`)
      .join("; ");
    return { success: false, error: `Datos inválidos: ${errors}` };
  }

  const { name, color } = validatedFields.data;
  const normalizedName = name.trim();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verificar si ya existe una marca global con el mismo nombre
      const existingGlobalBrand = await tx.brand.findFirst({
        where: { name: normalizedName },
      });

      let brandId: number;

      if (existingGlobalBrand) {
        // 2a. La marca global existe, verificar si ya está asociada a la organización
        const existingAssociation = await tx.organizationBrand.findUnique({
          where: {
            organizationId_brandId: {
              organizationId: org.organizationId || "",
              brandId: existingGlobalBrand.id,
            },
          },
        });

        if (existingAssociation) {
          throw new Error(`La marca "${normalizedName}" ya está asociada a tu organización.`);
        }

        // 2b. Asociar la marca global existente
        await tx.organizationBrand.create({
          data: {
            organizationId: org.organizationId || "",
            brandId: existingGlobalBrand.id,
            color: color || existingGlobalBrand.color || "#6B7280",
            order: 0, // Se ajustará automáticamente
          },
        });

        brandId = existingGlobalBrand.id;
      } else {
        // 3. Crear nueva marca global y asociarla
        const newBrand = await tx.brand.create({
          data: {
            name: normalizedName,
            color: color || "#6B7280",
          },
        });

        await tx.organizationBrand.create({
          data: {
            organizationId: org.organizationId || "",
            brandId: newBrand.id,
            color: color || newBrand.color || "#6B7280",
            order: 0,
          },
        });

        brandId = newBrand.id;
      }

      // 4. Devolver la información de la marca
      const brandInfo = await tx.brand.findUnique({
        where: { id: brandId },
        select: { id: true, name: true, color: true },
      });

      if (!brandInfo) {
        throw new Error("Error creando o asociando la marca");
      }
      return brandInfo;
    });

    revalidatePath("/stock");
    revalidatePath("/configuration");

    return {
      success: true,
      brand: result,
    };
  } catch (error) {
    console.error("Error creating quick local brand:", error);
    const message = error instanceof Error ? error.message : "Error inesperado";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Crea un modelo local rápido para una marca específica de la organización
 * Este modelo se agrega como global pero solo se asocia a la organización actual
 */
export async function createQuickLocalModel(
  prevState: QuickModelResult | null,
  formData: FormData,
): Promise<QuickModelResult> {
  const org = await getOrganizationIdFromSession();
  if (!org.organizationId) {
    return {
      success: false,
      error: "Usuario no autenticado o sin organización.",
    };
  }

  const validatedFields = quickModelSchema.safeParse({
    name: formData.get("name"),
    brandId: formData.get("brandId"),
  });

  if (!validatedFields.success) {
    const errors = Object.entries(validatedFields.error.flatten().fieldErrors)
      .map(([field, messages]) => `${field}: ${messages?.join(", ")}`)
      .join("; ");
    return { success: false, error: `Datos inválidos: ${errors}` };
  }

  const { name, brandId } = validatedFields.data;
  const normalizedName = name.trim();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verificar que la marca esté asociada a la organización
      const brandAssociation = await tx.organizationBrand.findUnique({
        where: {
          organizationId_brandId: {
            organizationId: org.organizationId || "",
            brandId: brandId,
          },
        },
      });

      if (!brandAssociation) {
        throw new Error("La marca no está asociada a tu organización.");
      }

      // 2. Verificar si el modelo ya existe globalmente para esta marca
      let modelId: number;
      const existingModel = await tx.model.findUnique({
        where: { name_brandId: { name: normalizedName, brandId: brandId } },
      });

      if (existingModel) {
        // 3a. El modelo existe, verificar si ya está configurado para la organización
        const existingConfig = await tx.organizationModelConfig.findUnique({
          where: {
            organizationId_modelId: {
              organizationId: org.organizationId || "",
              modelId: existingModel.id,
            },
          },
        });

        if (existingConfig?.isVisible) {
          throw new Error(
            `El modelo "${normalizedName}" ya está asociado a esta marca en tu organización.`,
          );
        }

        if (existingConfig && !existingConfig.isVisible) {
          // 3b. Reactivar modelo existente
          await tx.organizationModelConfig.update({
            where: { id: existingConfig.id },
            data: { isVisible: true },
          });
        } else {
          // 3c. Crear configuración para modelo existente
          const maxOrder = await tx.organizationModelConfig.aggregate({
            _max: { order: true },
            where: {
              organizationId: org.organizationId || "",
              model: { brandId: brandId },
            },
          });

          await tx.organizationModelConfig.create({
            data: {
              organizationId: org.organizationId || "",
              modelId: existingModel.id,
              order: (maxOrder._max.order ?? -1) + 1,
              isVisible: true,
            },
          });
        }

        modelId = existingModel.id;
      } else {
        // 4. Crear nuevo modelo global y configuración
        const newModel = await tx.model.create({
          data: {
            name: normalizedName,
            brandId: brandId,
          },
        });

        const maxOrder = await tx.organizationModelConfig.aggregate({
          _max: { order: true },
          where: {
            organizationId: org.organizationId || "",
            model: { brandId: brandId },
          },
        });

        await tx.organizationModelConfig.create({
          data: {
            organizationId: org.organizationId || "",
            modelId: newModel.id,
            order: (maxOrder._max.order ?? -1) + 1,
            isVisible: true,
          },
        });

        modelId = newModel.id;
      }

      // 5. Devolver información del modelo
      const modelInfo = await tx.model.findUnique({
        where: { id: modelId },
        select: { id: true, name: true, brandId: true },
      });

      if (!modelInfo) {
        throw new Error("Error creando o asociando el modelo");
      }
      return modelInfo;
    });

    revalidatePath("/stock");
    revalidatePath("/configuration");

    return {
      success: true,
      model: result,
    };
  } catch (error) {
    console.error("Error creating quick local model:", error);
    const message = error instanceof Error ? error.message : "Error inesperado";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Crea marca y modelo juntos de forma inteligente
 * - Si la marca existe globalmente, la asocia
 * - Si no existe, la crea y la asocia
 * - Si el modelo existe para esa marca, lo asocia
 * - Si no existe, lo crea y lo asocia
 */
export async function createQuickBrandAndModel(
  prevState: QuickBrandModelResult | null,
  formData: FormData,
): Promise<QuickBrandModelResult> {
  const org = await getOrganizationIdFromSession();
  if (!org.organizationId) {
    return {
      success: false,
      error: "Usuario no autenticado o sin organización.",
    };
  }

  const validatedFields = quickBrandModelSchema.safeParse({
    brandName: formData.get("brandName"),
    brandColor: formData.get("brandColor") || "#6B7280",
    modelName: formData.get("modelName"),
    brandId: formData.get("brandId") || undefined,
  });

  if (!validatedFields.success) {
    const errors = Object.entries(validatedFields.error.flatten().fieldErrors)
      .map(([field, messages]) => `${field}: ${messages?.join(", ")}`)
      .join("; ");
    return { success: false, error: `Datos inválidos: ${errors}` };
  }

  const { brandName, brandColor, modelName, brandId: existingBrandId } = validatedFields.data;
  const normalizedBrandName = brandName.trim();
  const normalizedModelName = modelName.trim();

  try {
    const result = await prisma.$transaction(async (tx) => {
      let finalBrandId: number;
      let brandInfo: { id: number; name: string; color: string | null };

      // 1. Manejar la marca
      if (existingBrandId) {
        // La marca existe globalmente, verificar si ya está asociada
        const existingAssociation = await tx.organizationBrand.findUnique({
          where: {
            organizationId_brandId: {
              organizationId: org.organizationId || "",
              brandId: existingBrandId,
            },
          },
        });

        if (!existingAssociation) {
          // Asociar la marca existente
          await tx.organizationBrand.create({
            data: {
              organizationId: org.organizationId || "",
              brandId: existingBrandId,
              color: brandColor || "#6B7280",
              order: 0,
            },
          });
        }

        finalBrandId = existingBrandId;
        const brand = await tx.brand.findUnique({
          where: { id: existingBrandId },
          select: { id: true, name: true, color: true },
        });
        if (!brand) {
          throw new Error("Error obteniendo información de la marca");
        }
        brandInfo = brand;
      } else {
        // Verificar si ya existe una marca con ese nombre
        const existingGlobalBrand = await tx.brand.findFirst({
          where: { name: normalizedBrandName },
        });

        if (existingGlobalBrand) {
          // La marca existe, asociarla si no está asociada
          const existingAssociation = await tx.organizationBrand.findUnique({
            where: {
              organizationId_brandId: {
                organizationId: org.organizationId || "",
                brandId: existingGlobalBrand.id,
              },
            },
          });

          if (!existingAssociation) {
            await tx.organizationBrand.create({
              data: {
                organizationId: org.organizationId || "",
                brandId: existingGlobalBrand.id,
                color: brandColor || existingGlobalBrand.color || "#6B7280",
                order: 0,
              },
            });
          }

          finalBrandId = existingGlobalBrand.id;
          brandInfo = {
            id: existingGlobalBrand.id,
            name: existingGlobalBrand.name,
            color: existingGlobalBrand.color,
          };
        } else {
          // Crear nueva marca global
          const newBrand = await tx.brand.create({
            data: {
              name: normalizedBrandName,
              color: brandColor || "#6B7280",
            },
          });

          await tx.organizationBrand.create({
            data: {
              organizationId: org.organizationId || "",
              brandId: newBrand.id,
              color: brandColor || newBrand.color || "#6B7280",
              order: 0,
            },
          });

          finalBrandId = newBrand.id;
          brandInfo = {
            id: newBrand.id,
            name: newBrand.name,
            color: newBrand.color,
          };
        }
      }

      // 2. Manejar el modelo
      let finalModelId: number;
      let modelInfo: { id: number; name: string; brandId: number };

      // Verificar si el modelo ya existe para esta marca
      const existingModel = await tx.model.findUnique({
        where: { name_brandId: { name: normalizedModelName, brandId: finalBrandId } },
      });

      if (existingModel) {
        // El modelo existe, verificar configuración de organización
        const existingConfig = await tx.organizationModelConfig.findUnique({
          where: {
            organizationId_modelId: {
              organizationId: org.organizationId || "",
              modelId: existingModel.id,
            },
          },
        });

        if (existingConfig?.isVisible) {
          throw new Error(
            `El modelo "${normalizedModelName}" ya está asociado a la marca "${normalizedBrandName}" en tu organización.`,
          );
        }

        if (existingConfig && !existingConfig.isVisible) {
          // Reactivar modelo
          await tx.organizationModelConfig.update({
            where: { id: existingConfig.id },
            data: { isVisible: true },
          });
        } else {
          // Crear configuración
          const maxOrder = await tx.organizationModelConfig.aggregate({
            _max: { order: true },
            where: {
              organizationId: org.organizationId || "",
              model: { brandId: finalBrandId },
            },
          });

          await tx.organizationModelConfig.create({
            data: {
              organizationId: org.organizationId || "",
              modelId: existingModel.id,
              order: (maxOrder._max.order ?? -1) + 1,
              isVisible: true,
            },
          });
        }

        finalModelId = existingModel.id;
        modelInfo = {
          id: existingModel.id,
          name: existingModel.name,
          brandId: existingModel.brandId,
        };
      } else {
        // Crear nuevo modelo
        const newModel = await tx.model.create({
          data: {
            name: normalizedModelName,
            brandId: finalBrandId,
          },
        });

        const maxOrder = await tx.organizationModelConfig.aggregate({
          _max: { order: true },
          where: {
            organizationId: org.organizationId || "",
            model: { brandId: finalBrandId },
          },
        });

        await tx.organizationModelConfig.create({
          data: {
            organizationId: org.organizationId || "",
            modelId: newModel.id,
            order: (maxOrder._max.order ?? -1) + 1,
            isVisible: true,
          },
        });

        finalModelId = newModel.id;
        modelInfo = {
          id: newModel.id,
          name: newModel.name,
          brandId: newModel.brandId,
        };
      }

      return { brandInfo, modelInfo };
    });

    revalidatePath("/stock");
    revalidatePath("/configuration");

    return {
      success: true,
      brand: result.brandInfo,
      model: result.modelInfo,
    };
  } catch (error) {
    console.error("Error creating quick brand and model:", error);
    const message = error instanceof Error ? error.message : "Error inesperado";
    return {
      success: false,
      error: message,
    };
  }
}
