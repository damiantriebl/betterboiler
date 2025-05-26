"use server";

import { getSession } from "@/actions/util";
import { deleteFromS3, uploadToS3 } from "@/lib/s3-unified";
import type { ActionState } from "@/types/action-states";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import sharp from "sharp";

// Singleton pattern para PrismaClient
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

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
  const sessionResult = await getSession();
  if (!sessionResult.session?.user) {
    return {
      success: false,
      error: "No autorizado. Debe iniciar sesión para realizar esta acción.",
    };
  }
  return { success: true, session: sessionResult.session };
}

// Helper function to validate and parse modelId
function _validateModelId(
  modelId: unknown,
): { success: true; id: number } | { success: false; error: string } {
  if (!modelId || typeof modelId !== "string") {
    return { success: false, error: "ID de modelo no válido" };
  }

  const parsedId = Number.parseInt(modelId, 10);
  if (Number.isNaN(parsedId) || parsedId <= 0) {
    return { success: false, error: "ID de modelo no válido" };
  }

  return { success: true, id: parsedId };
}

export async function uploadModelFiles(
  formData: FormData,
): Promise<ActionState & { files?: FileUploadResult[] }> {
  try {
    const authResult = await _getAuthenticatedSession();
    if (!authResult.success) {
      return authResult;
    }

    const modelIdValidation = _validateModelId(formData.get("modelId"));
    if (!modelIdValidation.success) {
      return { success: false, error: modelIdValidation.error };
    }

    const modelId = modelIdValidation.id;

    const model = await prisma.model.findUnique({
      where: { id: modelId },
      include: { brand: true },
    });

    if (!model) {
      return { success: false, error: "Modelo no encontrado" };
    }

    const brandNameSanitized = model.brand.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const modelNameSanitized = model.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const basePath = `models/${brandNameSanitized}/${modelNameSanitized}`;

    const uploadPromises: Promise<FileUploadResult | null>[] = [];

    for (const [key, value] of formData.entries()) {
      if (!(value instanceof File) || key === "modelId") continue;

      const file = value;
      const isImage = file.type.startsWith("image/");
      const isPDF =
        file.type === "application/pdf" ||
        (file.name.toLowerCase().endsWith(".pdf") && file.type === "application/octet-stream");

      if (isImage) {
        const uploadPromise = _processImageFile(file, modelId, basePath);
        uploadPromises.push(uploadPromise);
      } else if (isPDF) {
        const uploadPromise = _processPDFFile(file, modelId, basePath);
        uploadPromises.push(uploadPromise);
      }
    }

    const results = await Promise.all(uploadPromises);
    const uploadedFiles = results.filter((result): result is FileUploadResult => result !== null);

    revalidatePath("/root/global-brands");
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

async function _processImageFile(
  file: File,
  modelId: number,
  basePath: string,
): Promise<FileUploadResult | null> {
  try {
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

    const [largeResult, smallResult] = await Promise.all([
      uploadToS3(largeBuffer, `${basePath}/images/${fileName}_800.webp`, "image/webp"),
      uploadToS3(smallBuffer, `${basePath}/images/${fileName}_400.webp`, "image/webp"),
    ]);

    if (largeResult.success) {
      const createdFile = await prisma.modelFile.create({
        data: {
          modelId,
          name: file.name,
          type: "image",
          url: largeResult.url,
          size: largeBuffer.length,
          s3Key: largeResult.key,
          s3KeySmall: smallResult.success ? smallResult.key : null,
        },
      });

      return {
        id: createdFile.id,
        url: createdFile.url,
        name: createdFile.name,
        type: createdFile.type,
        size: createdFile.size,
        createdAt: createdFile.createdAt,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error procesando imagen ${file.name}:`, error);
    return null;
  }
}

async function _processPDFFile(
  file: File,
  modelId: number,
  basePath: string,
): Promise<FileUploadResult | null> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    // Validación mejorada para PDFs
    if (
      file.type !== "application/pdf" &&
      !(file.type === "application/octet-stream" && file.name.toLowerCase().endsWith(".pdf"))
    ) {
      throw new Error(
        `Tipo de archivo no válido para PDF: ${file.type}. Solo se aceptan archivos PDF.`,
      );
    }

    const result = await uploadToS3(buffer, `${basePath}/specs/${file.name}`, "application/pdf");

    if (result.success) {
      const createdFile = await prisma.modelFile.create({
        data: {
          modelId,
          name: file.name,
          type: "spec",
          url: result.url,
          size: file.size,
          s3Key: result.key,
        },
      });

      return {
        id: createdFile.id,
        url: createdFile.url,
        name: createdFile.name,
        type: createdFile.type,
        size: createdFile.size,
        createdAt: createdFile.createdAt,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error procesando PDF ${file.name}:`, error);
    return null;
  }
}

export async function getModelFiles(
  modelId: number,
): Promise<ActionState & { files?: FileUploadResult[] }> {
  try {
    const authResult = await _getAuthenticatedSession();
    if (!authResult.success) {
      return authResult;
    }

    if (!modelId || modelId <= 0 || Number.isNaN(modelId)) {
      return { success: false, error: "ID de modelo no válido" };
    }

    const files = await prisma.modelFile.findMany({
      where: { modelId },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      files: files.map((file) => ({
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

    if (!fileId || fileId.trim() === "") {
      return { success: false, error: "ID de archivo no válido" };
    }

    const file = await prisma.modelFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return { success: false, error: "Archivo no encontrado" };
    }

    // Eliminar archivos de S3
    const s3DeletionPromises: Promise<void>[] = [deleteFromS3(file.s3Key)];

    // Si es una imagen, eliminar también la versión pequeña
    if (file.type === "image" && file.s3KeySmall) {
      s3DeletionPromises.push(deleteFromS3(file.s3KeySmall));
    }

    try {
      await Promise.all(s3DeletionPromises);
    } catch (s3Error) {
      console.error("Error al eliminar archivo(s) de S3:", s3Error);
      return {
        success: false,
        error: `Error al eliminar archivo de S3: ${s3Error instanceof Error ? s3Error.message : String(s3Error)}`,
      };
    }

    // Eliminar registro de la base de datos
    await prisma.modelFile.delete({
      where: { id: fileId },
    });

    revalidatePath("/root/global-brands");
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
