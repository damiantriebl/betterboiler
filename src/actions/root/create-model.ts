"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const createModel = async ({
  name,
  brandId,
  pathToRevalidate = "/configuration",
}: {
  name: string;
  brandId: number;
  pathToRevalidate?: string;
}) => {
  try {
    const model = await prisma.model.create({
      data: { name, brandId },
    });
    revalidatePath(pathToRevalidate);
    return { success: true, model };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "El modelo ya existe para esta marca." };
    }
    return { success: false, error: error.message || "Error al crear modelo." };
  }
}; 