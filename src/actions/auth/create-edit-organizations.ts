"use server";
import prisma from "@/lib/prisma";
import type { serverMessage } from "@/types/ServerMessageType";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { uploadToS3 } from "@/lib/s3-unified";

export async function createOrUpdateOrganization(formData: FormData): Promise<serverMessage> {
  // Verificar autenticación
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session?.user) {
    return {
      success: false,
      error: "Usuario no autenticado",
    };
  }

  const id = formData.get("id") as string | null;
  const name = formData.get("name") as string | null;
  const logo = formData.get("logo") as string | null; // Para compatibilidad con URLs
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
      console.log("new organization", org);
    }

    // Validar que organizationId existe
    if (!organizationId) {
      throw new Error("Organization ID is required");
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
          return uploadToS3(resizedBuffer, path, "image/webp");
        }),
      );
      // Use the result of the 400px upload (first in sizes array)
      const result400 = uploadResults[0];
      if (result400.success && result400.key) {
        // Store the S3 key in the database
        logoUrl = result400.key;
      } else {
        console.error("Error uploading 400px logo:", result400);
      }
    } else if (logo) {
      // Si no hay archivo pero sí URL, usar la URL
      logoUrl = logo;
    }

    // --- Subida de la Miniatura (si existe) ---
    if (thumbnailFile && organizationId) {
      const thumbnailBuffer = Buffer.from(await thumbnailFile.arrayBuffer());
      const resizedThumbnailBuffer = await sharp(thumbnailBuffer)
        .resize({ width: 200, height: 200, fit: "inside", withoutEnlargement: true }) // Redimensionar a max 200x200
        .webp({ quality: 75 })
        .toBuffer();
      const thumbnailPath = `organization/${organizationId}/thumbnail_200`;
      const thumbnailUploadResult = await uploadToS3(
        resizedThumbnailBuffer,
        thumbnailPath,
        "image/webp"
      );
      if (thumbnailUploadResult.success && thumbnailUploadResult.key) {
        thumbnailUrl = thumbnailUploadResult.key; // Guardar KEY del thumbnail
      } else {
        console.error("Error uploading 200px thumbnail:", thumbnailUploadResult);
      }
    }

    // Actualizar datos de la organización (incluyendo thumbnail si existe)
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        name,
        ...(logoUrl && { logo: logoUrl }),
        ...(thumbnailUrl && { thumbnail: thumbnailUrl }),
      },
    });
    revalidatePath("/root");
    return {
      success:
        organizationId === id
          ? "Organización actualizada con éxito."
          : "Organización creada con éxito.",
      error: false,
    };
  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION:", error);
    return { error: (error as Error).message || "Ocurrió un error inesperado.", success: false };
  }
}

// Función wrapper para crear organizaciones (compatibilidad con create-organizations.ts)
export async function createOrganization(
  prevState: { success: string | false; error: string | false },
  formData: FormData,
): Promise<serverMessage> {
  // Remover el ID para forzar creación
  const newFormData = new FormData();
  for (const [key, value] of formData.entries()) {
    if (key !== 'id') {
      newFormData.append(key, value);
    }
  }
  
  return await createOrUpdateOrganization(newFormData);
}

// Función wrapper para actualizar organizaciones (compatibilidad con update-organizations.ts)
export async function updateOrganization(
  prevState: { success: string | false; error: string | false },
  formData: FormData,
): Promise<serverMessage> {
  // Verificar que tenga ID para forzar actualización
  const id = formData.get("id");
  if (!id) {
    return { error: "ID de organización requerido para actualización", success: false };
  }
  
  return await createOrUpdateOrganization(formData);
}
