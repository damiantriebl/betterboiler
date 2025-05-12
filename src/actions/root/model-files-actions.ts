"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { uploadToS3, deleteFromS3 } from "@/lib/s3";
import type { ActionState } from "@/types/action-states";

const prisma = new PrismaClient();

interface FileUploadResult {
  id: string;
  url: string;
  name: string;
  type: string;
  size: number;
  createdAt: Date;
}

// Helper function to get and validate session
async function _getAuthenticatedSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { success: false, error: "No autorizado. Debe iniciar sesión para realizar esta acción." };
  }
  return { success: true, session };
}

export async function uploadModelFiles(formData: FormData): Promise<ActionState & { files?: FileUploadResult[] }> {
  try {
    const authResult = await _getAuthenticatedSession();
    if (!authResult.success) {
      return authResult;
    }

    const modelId = formData.get("modelId");
    if (!modelId || typeof modelId !== "string") {
      return { success: false, error: "ID de modelo no válido" };
    }

    const model = await prisma.model.findUnique({
      where: { id: parseInt(modelId) },
      include: { brand: true },
    });

    if (!model) {
      return { success: false, error: "Modelo no encontrado" };
    }

    const brandNameSanitized = model.brand.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const modelNameSanitized = model.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const basePath = `models/${brandNameSanitized}/${modelNameSanitized}`;
    
    const uploadedFiles: FileUploadResult[] = [];
    const uploadPromises: Promise<void>[] = [];

    for (const [key, value] of formData.entries()) {
      if (!(value instanceof File) || key === "modelId") continue;

      const file = value;
      const isImage = file.type.startsWith("image/");
      const isPDF = file.type === "application/pdf" || 
                    (file.name.toLowerCase().endsWith('.pdf') && file.type === "application/octet-stream");
      
      if (isImage) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = file.name.split(".")[0];
        
        // Crear versión grande (800px)
        const largeBuffer = await sharp(buffer)
          .resize(800, null, { withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        
        // Crear versión pequeña (400px)
        const smallBuffer = await sharp(buffer)
          .resize(400, null, { withoutEnlargement: true })
          .webp({ quality: 75 })
          .toBuffer();

        const uploadPromise = Promise.all([
          uploadToS3(largeBuffer, `${basePath}/images/${fileName}_800.webp`, "image/webp"),
          uploadToS3(smallBuffer, `${basePath}/images/${fileName}_400.webp`, "image/webp")
        ]).then(async ([largeResult, smallResult]) => {
          if (largeResult.success) {
            const createdFile = await prisma.modelFile.create({
              data: {
                modelId: parseInt(modelId),
                name: file.name,
                type: "image",
                url: largeResult.url,
                size: largeBuffer.length,
                s3Key: largeResult.key,
                s3KeySmall: smallResult.success ? smallResult.key : null,
              }
            });

            uploadedFiles.push({
              id: createdFile.id,
              url: createdFile.url,
              name: createdFile.name,
              type: createdFile.type,
              size: createdFile.size,
              createdAt: createdFile.createdAt,
            });
          }
        });

        uploadPromises.push(uploadPromise);
      } else if (isPDF) {
        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Verificación adicional del tipo MIME para PDF
        if (file.type !== "application/pdf") {
          if (file.type === "application/octet-stream") {
            throw new Error(`MIME desconocido para archivo: ${file.name}`);
          }
          throw new Error(`Tipo de archivo no válido para PDF: ${file.type}. Solo se aceptan archivos PDF.`);
        }
        
        const uploadPromise = uploadToS3(buffer, `${basePath}/specs/${file.name}`, "application/pdf").then(async (result) => {
          if (result.success) {
            const createdFile = await prisma.modelFile.create({
              data: {
                modelId: parseInt(modelId),
                name: file.name,
                type: "spec",
                url: result.url,
                size: file.size,
                s3Key: result.key,
              }
            });

            uploadedFiles.push({
              id: createdFile.id,
              url: createdFile.url,
              name: createdFile.name,
              type: createdFile.type,
              size: createdFile.size,
              createdAt: createdFile.createdAt,
            });
          }
        });

        uploadPromises.push(uploadPromise);
      }
    }

    await Promise.all(uploadPromises);

    revalidatePath(`/root/global-brands`);
    return {
      success: true,
      message: `${uploadedFiles.length} archivo(s) subido(s) correctamente`,
      files: uploadedFiles,
    };

  } catch (error) {
    console.error("Error en uploadModelFiles:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al subir archivos",
    };
  }
}

export async function getModelFiles(modelId: number): Promise<ActionState & { files?: FileUploadResult[] }> {
  try {
    const authResult = await _getAuthenticatedSession();
    if (!authResult.success) {
      return authResult;
    }

    const files = await prisma.modelFile.findMany({
      where: { modelId },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      files: files.map(file => ({
        id: file.id,
        url: file.url,
        name: file.name,
        type: file.type,
        size: file.size,
        createdAt: file.createdAt,
      })),
    };

  } catch (error) {
    console.error("Error en getModelFiles:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al obtener archivos",
    };
  }
}

export async function deleteModelFile(fileId: string): Promise<ActionState> {
  try {
    const authResult = await _getAuthenticatedSession();
    if (!authResult.success) {
      return authResult;
    }

    const file = await prisma.modelFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return { success: false, error: "Archivo no encontrado" };
    }

    // Eliminar archivo principal de S3
    await deleteFromS3(file.s3Key);

    // Si es una imagen, eliminar también la versión pequeña
    if (file.type === "image" && file.s3KeySmall) {
      await deleteFromS3(file.s3KeySmall);
    }

    // Eliminar registro de la base de datos
    await prisma.modelFile.delete({
      where: { id: fileId },
    });

    revalidatePath(`/root/global-brands`);
    return {
      success: true,
      message: "Archivo eliminado correctamente",
    };

  } catch (error) {
    console.error("Error en deleteModelFile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al eliminar archivo",
    };
  }
} 