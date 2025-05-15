"use server";
import prisma from "@/lib/prisma";
import type { serverMessage } from "@/types/ServerMessageType";
import { revalidatePath } from "next/cache";
// import sharp from "sharp"; // Comentado si no se usa en esta action
// import { getSignedS3Url } from "../S3/get-signed-url"; // Comentado si no se usa en esta action

export async function updateUserAction(
  prevState: serverMessage,
  formData: FormData,
): Promise<serverMessage> {
  try {
    const userId = formData.get("userId")?.toString();
    const name = formData.get("name")?.toString();
    const email = formData.get("email")?.toString();
    const profileImageKey = formData.get("profileImageKey")?.toString();

    if (!userId || !name || !email) {
      return { success: false, error: "Todos los campos son obligatorios" };
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
        profileOriginal: profileImageKey || null,
      },
    });

    revalidatePath("/profile");

    return {
      success: "Perfil actualizado correctamente",
      error: false,
    };
  } catch (error) {
    console.error("Error al actualizar el perfil:", error);
    return {
      success: false,
      error: "Ha ocurrido un error al actualizar el perfil",
    };
  }
}
