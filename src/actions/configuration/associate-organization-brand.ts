"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

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
    // Obtener el color global de la marca
    const globalBrand = await prisma.brand.findUnique({
      where: { id: Number(brandId) },
      select: { color: true },
    });

    // Intenta crear la relación con el color global por defecto
    await prisma.organizationBrand.create({
      data: {
        organizationId,
        brandId: Number(brandId),
        color: globalBrand?.color || null, // Usa el color global como valor por defecto
      },
    });

    if (pathToRevalidate) {
      revalidatePath(pathToRevalidate);
    }

    return { success: true, message: "Marca asociada correctamente." };
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
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al asociar la marca.",
    };
  }
};
