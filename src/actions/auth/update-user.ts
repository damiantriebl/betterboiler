"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface UpdateUserActionResult {
  success: boolean;
  error?: string;
}

export async function updateUserAction(
  prevState: UpdateUserActionResult,
  formData: FormData,
): Promise<UpdateUserActionResult> {
  try {
    const userId = formData.get("userId")?.toString();
    const name = formData.get("name")?.toString();
    const email = formData.get("email")?.toString();
    const phone = formData.get("phone")?.toString();
    const address = formData.get("address")?.toString();
    const profileOriginalKey = formData.get("profileOriginalKey")?.toString();
    const profileCropKey = formData.get("profileCropKey")?.toString();

    if (!userId || !name || !email) {
      return { success: false, error: "Los campos nombre y email son obligatorios" };
    }

    const existingUser = await prisma.user.findFirst({
      where: { email, NOT: { id: userId } },
    });
    if (existingUser) {
      return {
        success: false,
        error: "Este correo electrónico ya está en uso por otro usuario",
      };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        phone: phone || null,
        address: address || null,
        profileOriginal: profileOriginalKey || null,
        profileCrop: profileCropKey || null,
      },
    });

    revalidatePath("/profile");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error al actualizar el perfil:", error);
    return {
      success: false,
      error: "Ha ocurrido un error al actualizar el perfil",
    };
  }
}
