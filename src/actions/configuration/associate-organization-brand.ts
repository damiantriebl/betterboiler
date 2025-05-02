"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
    // Intenta crear la relación, si ya existe retorna error amigable
    await prisma.organizationBrand.create({
      data: {
        organizationId,
        brandId: Number(brandId),
      },
    });
    
    if (pathToRevalidate) {
      revalidatePath(pathToRevalidate);
    }
    
    return { success: true, message: "Marca asociada correctamente." };
  } catch (error: any) {
    if (
      error.code === "P2002" ||
      (error.message && error.message.includes("Unique constraint failed"))
    ) {
      return {
        success: false,
        error: "La marca ya está asociada a esta organización.",
      };
    }
    return {
      success: false,
      error: error.message || "Error al asociar la marca.",
    };
  }
}; 