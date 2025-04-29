"use server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import type { serverMessage } from "@/types/ServerMessageType";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import { uploadBufferToS3 } from "../S3/upload-buffer-to-s3";

export async function createOrUpdateOrganization(formData: FormData): Promise<serverMessage> {
  const id = formData.get("id") as string | null;
  const name = formData.get("name") as string | null;
  const logoFile = formData.get("logoFile") as File | null;
  const thumbnailFile = formData.get("thumbnailFile") as File | null;

  if (!name) return { error: "El nombre es requerido.", success: false };

  try {
    let logoUrl: string | undefined;
    let thumbnailUrl: string | undefined;
    let organizationId = id;

    // Si es creación, primero creamos organización para obtener el ID
    if (!organizationId) {
      let slug = name.toLowerCase().replace(/ /g, "-");
      const exists = await prisma.organization.findUnique({ where: { slug } });
      if (exists) slug += `-${uuidv4().slice(0, 8)}`;
      const org = await prisma.organization.create({ data: { name, slug } });
      organizationId = org.id;
    }

    // Si hay archivo de logo, subimos con el ID correcto
    if (logoFile && organizationId) {
      const buffer = Buffer.from(await logoFile.arrayBuffer());
      const sizes = [400, 200, 100];
      // Upload all sizes and capture the key for the 400px version
      const uploadResults = await Promise.all(
        sizes.map(async (size) => {
          const resizedBuffer = await sharp(buffer)
            .resize({ width: size, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
          const path = `organization/${organizationId}/logo_${size}`;
          return uploadBufferToS3({ buffer: resizedBuffer, path });
        })
      );
      // Use the result of the 400px upload (first in sizes array)
      const result400 = uploadResults[0];
      if (result400.success && result400.path) {
        // Store the S3 key in the database
        logoUrl = result400.path;
      } else {
        console.error('Error uploading 400px logo:', result400);
      }
    }

    // --- Subida de la Miniatura (si existe) ---
    if (thumbnailFile && organizationId) {
      const thumbnailBuffer = Buffer.from(await thumbnailFile.arrayBuffer());
      const resizedThumbnailBuffer = await sharp(thumbnailBuffer)
          .resize({ width: 200, height: 200, fit: 'inside', withoutEnlargement: true }) // Redimensionar a max 200x200
          .webp({ quality: 75 })
          .toBuffer();
      const thumbnailPath = `organization/${organizationId}/thumbnail_200`;
      const thumbnailUploadResult = await uploadBufferToS3({ buffer: resizedThumbnailBuffer, path: thumbnailPath });
      if (thumbnailUploadResult.success && thumbnailUploadResult.path) {
        thumbnailUrl = thumbnailUploadResult.path; // Guardar KEY del thumbnail
      } else {
        console.error('Error uploading 200px thumbnail:', thumbnailUploadResult);
      }
    }

    // Actualizar datos de la organización (incluyendo thumbnail si existe)
    await prisma.organization.update({
      where: { id: organizationId! },
      data: {
        name,
        ...(logoUrl && { logo: logoUrl }),
        ...(thumbnailUrl && { thumbnail: thumbnailUrl })
      },
    });
    revalidatePath("/root");
    return { success: organizationId === id ? "Organización actualizada con éxito." : "Organización creada con éxito.", error: false };
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION:", error);
    return { error: (error as Error).message || "Ocurrió un error inesperado.", success: false };
  }
}
