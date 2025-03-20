"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { serverMessage } from "@/schemas/serverMessage";
import { getSignedURL } from "../S3/get-signed-url";

export async function updateUserAction(
  prevState: serverMessage,
  formData: FormData
): Promise<serverMessage> {
  try {
    const userId = formData.get("userId")?.toString();
    const name = formData.get("name")?.toString();
    const email = formData.get("email")?.toString();
    const originalFile = formData.get("originalFile") as File;
    const croppedFile = formData.get("croppedFile") as File;
    console.log('formdata', formData);
    if (!userId || !name || !email) {
      return { 
        success: false, 
        error: "Todos los campos son obligatorios" 
      };
    }
    
    // Verificar si el email ya está en uso por otro usuario
    const existingUser = await prisma.user.findFirst({
      where: { email, NOT: { id: userId } }
    });
    if (existingUser) {
      return {
        success: false,
        error: "Este correo electrónico ya está en uso por otro usuario"
      };
    }
    
    // Obtener URL firmada para el archivo original con nombre "profileOriginal"
    const signedOriginal = await getSignedURL({ name: "profileOriginal" });
    if (signedOriginal.failure !== undefined) {
      console.error("Error en firma original");
      return { 
        success: false, 
        error: "No se pudo obtener la firma para el archivo original" 
      };
    }
    const urlOriginal = signedOriginal.success?.url;
    
    // Obtener URL firmada para el archivo recortado con nombre "profileCrop"
    const signedCrop = await getSignedURL({ name: "profileCrop" });
    if (signedCrop.failure !== undefined) {
      console.error("Error en firma recortada");
      return { 
        success: false, 
        error: "No se pudo obtener la firma para el archivo recortado" 
      };
    }
    const urlCrop = signedCrop.success?.url;
    
    // Subir el archivo original a S3
    await fetch(urlOriginal, {
      method: "PUT",
      body: originalFile,
      headers: { "Content-Type": originalFile.type }
    });
    
    // Subir el archivo recortado a S3
    await fetch(urlCrop, {
      method: "PUT",
      body: croppedFile,
      headers: { "Content-Type": croppedFile.type }
    });
    
    // Construir las URLs públicas. 
    // Suponiendo que la key en S3 se forma como: `${userId}/profileOriginal.jpg` y `${userId}/profileCrop.jpg`
    const bucket = process.env.AWS_BUCKET_NAME;
    const region = process.env.AWS_BUCKET_REGION;
    const publicOriginalUrl = `https://${bucket}.s3.${region}.amazonaws.com/${userId}/profileOriginal.jpg`;
    const publicCropUrl = `https://${bucket}.s3.${region}.amazonaws.com/${userId}/profileCrop.jpg`;
    
    // Actualizar usuario: removemos "image" y agregamos los nuevos campos con la URL pública
    await prisma.user.update({
      where: { id: userId },
      data: { 
        name, 
        email,
        profileOriginal: publicOriginalUrl,
        profileCrop: publicCropUrl,
      },
    });
    
    revalidatePath("/profile");
    
    return {
      success: "Perfil actualizado correctamente",
      error: false
    };
  } catch (error) {
    console.error("Error al actualizar el perfil:", error);
    return {
      success: false,
      error: "Ha ocurrido un error al actualizar el perfil"
    };
  }
}
