"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrganizationIdFromSession } from "../util";

// Esquema de validación para disociar marca
const dissociateBrandSchema = z.object({
  organizationBrandId: z.string().min(1, "ID de asociación requerido"),
});

export const associateOrganizationBrand = async ({
  organizationId,
  brandId,
  pathToRevalidate = "/configuration",
}: {
  organizationId: string;
  brandId: string;
  pathToRevalidate?: string;
}) => {
  try {
    // 1. Find the global brand and its models
    const globalBrandWithModels = await prisma.brand.findUnique({
      where: { id: Number(brandId) },
      include: {
        models: {
          orderBy: { name: "asc" }, // Optional: maintain a consistent initial order
        },
      },
    });

    if (!globalBrandWithModels) {
      console.log("associateOrganizationBrand: No se encontró la marca global con ID:", brandId);
      return { success: false, error: "La marca global no fue encontrada." };
    }
    console.log(
      "associateOrganizationBrand: globalBrandWithModels encontrado:",
      JSON.stringify(globalBrandWithModels, null, 2),
    );

    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // 2. Create the OrganizationBrand association
      await tx.organizationBrand.create({
        data: {
          organizationId,
          brandId: Number(brandId),
          color: globalBrandWithModels.color || null,
        },
      });

      // 3. Create OrganizationModelConfig for each model of the brand
      if (globalBrandWithModels.models && globalBrandWithModels.models.length > 0) {
        const modelConfigs = globalBrandWithModels.models.map((model, index) => ({
          organizationId,
          modelId: model.id,
          isVisible: true,
          order: index,
        }));
        console.log(
          "associateOrganizationBrand: modelConfigs a crear:",
          JSON.stringify(modelConfigs, null, 2),
        );
        await tx.organizationModelConfig.createMany({
          data: modelConfigs,
          skipDuplicates: true,
        });
      }
    });

    if (pathToRevalidate) {
      revalidatePath(pathToRevalidate);
    }

    return { success: true, message: "Marca asociada y modelos configurados correctamente." };
  } catch (error: unknown) {
    if (
      (error instanceof PrismaClientKnownRequestError && error.code === "P2002") ||
      (error instanceof Error && error.message?.includes("Unique constraint failed"))
    ) {
      return {
        success: false,
        error: "La marca ya está asociada a esta organización.",
      };
    }
    console.error("Error associating brand:", error); // Log the actual error
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al asociar la marca y configurar sus modelos.",
    };
  }
};

// --- Acción: dissociateOrganizationBrand (Reemplaza deleteOrganizationBrand) ---
export interface DissociateBrandState {
  success: boolean;
  error?: string | null;
}

export async function dissociateOrganizationBrand(
  prevState: DissociateBrandState | null,
  formData: FormData,
): Promise<DissociateBrandState> {
  const orgResult = await getOrganizationIdFromSession();
  if (!orgResult.organizationId)
    return { success: false, error: "Usuario no autenticado o sin organización." };

  const validatedFields = dissociateBrandSchema.safeParse({
    organizationBrandId: formData.get("organizationBrandId"),
  });

  if (!validatedFields.success) return { success: false, error: "ID de asociación inválido." };
  const { organizationBrandId } = validatedFields.data;

  try {
    // Convertir organizationBrandId a número
    const brandId = Number.parseInt(organizationBrandId);
    if (Number.isNaN(brandId)) {
      return { success: false, error: "ID de asociación inválido." };
    }

    // Verificar que la asociación pertenece a la organización actual
    const associationToDelete = await prisma.organizationBrand.findUnique({
      where: { id: brandId },
    });
    if (!associationToDelete || associationToDelete.organizationId !== orgResult.organizationId) {
      return {
        success: false,
        error: "Asociación no encontrada o no pertenece a tu organización.",
      };
    }

    // Borrar solo la entrada en OrganizationBrand
    await prisma.organizationBrand.delete({ where: { id: brandId } });

    revalidatePath("/configuracion"); // Asumo que es /configuration como en otros lados
    return { success: true };
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION (dissociateOrganizationBrand):", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { success: false, error: "La asociación a eliminar no se encontró." };
    }
    return { success: false, error: "Error al desasociar la marca." };
  }
}
