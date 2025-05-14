"use server";
import prisma from "@/lib/prisma";
import type { serverMessage } from "@/types/ServerMessageType";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { getSignedURL } from "../S3/get-signed-url";

export async function updateUserAction(
  prevState: serverMessage,
  formData: FormData,
): Promise<serverMessage> {
  try {
    const userId = formData.get("userId")?.toString();
    const name = formData.get("name")?.toString();
    const email = formData.get("email")?.toString();
    const originalFile = formData.get("originalFile") as File;
    const croppedFile = formData.get("croppedFile") as File;

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

    const resizeAndConvert = async (file: File, width: number) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      return sharp(buffer)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    };

    const sizesOriginal = [1200, 800, 400];
    const sizesCrop = [500, 300, 150];

    const originalOptimized = await Promise.all(
      sizesOriginal.map((size) => resizeAndConvert(originalFile, size)),
    );

    const cropOptimized = await Promise.all(
      sizesCrop.map((size) => resizeAndConvert(croppedFile, size)),
    );

    const signedOriginalUrls = await Promise.all(
      sizesOriginal.map((size) =>
        getSignedURL({ name: `profile/${userId}/profileOriginal_${size}` }),
      ),
    );

    const signedCropUrls = await Promise.all(
      sizesCrop.map((size) => getSignedURL({ name: `profile/${userId}/profileCrop_${size}` })),
    );

    if (
      signedOriginalUrls.some((url) => url.failure) ||
      signedCropUrls.some((url) => url.failure)
    ) {
      return {
        success: false,
        error: "Error al generar URLs firmadas",
      };
    }

    // Filter out unsuccessful signed URLs before mapping to fetch promises
    const originalFetchPromises = signedOriginalUrls
      .filter((signed) => signed.success?.url)
      .map((signed, idx) => {
        // Changed ! to ?. Need to handle potential undefined URL before fetch
        const url = signed.success?.url;
        return url
          ? fetch(url, {
              method: "PUT",
              body: originalOptimized[idx],
              headers: { "Content-Type": "image/webp" },
            })
          : Promise.resolve(null); // Return a resolved promise with null if URL is undefined
      })
      .filter((promise): promise is Promise<Response> => promise !== null); // Filter out the null promises

    const cropFetchPromises = signedCropUrls
      .filter((signed) => signed.success?.url)
      .map((signed, idx) => {
        // Changed ! to ?. Need to handle potential undefined URL before fetch
        const url = signed.success?.url;
        return url
          ? fetch(url, {
              method: "PUT",
              body: cropOptimized[idx],
              headers: { "Content-Type": "image/webp" },
            })
          : Promise.resolve(null); // Return a resolved promise with null if URL is undefined
      })
      .filter((promise): promise is Promise<Response> => promise !== null); // Filter out the null promises

    await Promise.all([...originalFetchPromises, ...cropFetchPromises]);

    const bucket = process.env.AWS_BUCKET_NAME;
    const region = process.env.AWS_BUCKET_REGION;

    const urlsOriginal = sizesOriginal.map(
      (size) =>
        `https://${bucket}.s3.${region}.amazonaws.com/profile/${userId}/profileOriginal_${size}`,
    );
    const urlsCrop = sizesCrop.map(
      (size) =>
        `https://${bucket}.s3.${region}.amazonaws.com/profile/${userId}/profileCrop_${size}`,
    );

    await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        profileOriginal: urlsOriginal[0],
        profileCrop: urlsCrop[0],
        profileOriginalVariants: urlsOriginal,
        profileCropVariants: urlsCrop,
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
