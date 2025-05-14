"use server";

import prisma from "@/lib/prisma";

export const getModelsByBrandId = async (brandId: number) => {
  try {
    const models = await prisma.model.findMany({
      where: { brandId },
      orderBy: { name: "asc" },
    });
    return { success: true, models };
  } catch (error: unknown) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Error al obtener modelos." 
    };
  }
};
