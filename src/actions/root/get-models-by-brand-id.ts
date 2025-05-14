"use server";

import prisma from "@/lib/prisma";

export const getModelsByBrandId = async (brandId: number) => {
  try {
    const models = await prisma.model.findMany({
      where: { brandId },
      orderBy: { name: "asc" },
    });
    return { success: true, models };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al obtener modelos." };
  }
};
