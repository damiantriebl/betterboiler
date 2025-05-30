"use server";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  type PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";

// ===========================
// CONFIGURACIÓN UNIFICADA
// ===========================

// Validar variables de entorno requeridas
const requiredEnvVars = {
  AWS_REGION: process.env.AWS_REGION || process.env.AWS_BUCKET_REGION || "us-east-1",
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "",
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "",
  AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME || "uknapex",
} as const;

// Cliente S3 unificado
const s3Client = new S3Client({
  region: requiredEnvVars.AWS_REGION,
  credentials: {
    accessKeyId: requiredEnvVars.AWS_ACCESS_KEY_ID,
    secretAccessKey: requiredEnvVars.AWS_SECRET_ACCESS_KEY,
  },
});

// ===========================
// TIPOS Y INTERFACES
// ===========================

export type FileType = "image" | "image_small" | "spec_sheet" | "other";

export interface UploadOptions {
  cacheControl?: string;
  customMetadata?: Record<string, string>;
  addTimestamp?: boolean;
}

interface S3UploadSuccess {
  success: true;
  url: string;
  key: string;
}

interface S3UploadError {
  success: false;
  error: string;
}

export type S3UploadResult = S3UploadSuccess | S3UploadError;

export type SignedUrlResult = { success: { url: string } } | { failure: string };

// ===========================
// UTILIDADES
// ===========================

/**
 * Determina el tipo MIME basado en la extensión del archivo
 */
const getMimeType = (fileName: string): string => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    // Imágenes
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",

    // Documentos
    pdf: "application/pdf",

    // Office
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ppt: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",

    // Archivos
    zip: "application/zip",
    txt: "text/plain",
    csv: "text/csv",
    html: "text/html",
    js: "application/javascript",
    json: "application/json",
    xml: "application/xml",
  };

  return mimeTypes[extension || ""] || "application/octet-stream";
};

/**
 * Normaliza nombres para crear slugs de URL
 */
const createSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-");
};

/**
 * Genera nombre único con timestamp si es requerido
 */
const generateFileName = (originalName: string, addTimestamp = false): string => {
  if (!addTimestamp) return originalName;

  const timestamp = Date.now();
  const extension = originalName.split(".").pop();
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
  const cleanName = nameWithoutExt.replace(/[^a-zA-Z0-9-_.]/g, "-").toLowerCase();

  return `${cleanName}-${timestamp}.${extension}`;
};

/**
 * Construye URL pública del archivo
 */
const buildPublicUrl = (key: string): string => {
  const bucketDomain =
    process.env.AWS_CLOUDFRONT_DOMAIN ||
    `${requiredEnvVars.AWS_BUCKET_NAME}.s3.${requiredEnvVars.AWS_REGION}.amazonaws.com`;

  return `https://${bucketDomain}/${key}`;
};

// ===========================
// FUNCIONES PRINCIPALES
// ===========================

/**
 * Función principal para subir archivos a S3
 * Soporta File, Buffer y Blob
 */
export async function uploadToS3(
  input: File | Buffer | Blob | string,
  key: string,
  contentType?: string,
  options: UploadOptions = {},
): Promise<S3UploadResult> {
  try {
    let buffer: Buffer;
    let finalContentType = contentType || "application/octet-stream";

    // Convertir input a Buffer
    if (Buffer.isBuffer(input)) {
      buffer = input;
    } else if (input instanceof File) {
      const arrayBuffer = await input.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      finalContentType = input.type || finalContentType;
    } else if (input instanceof Blob) {
      const arrayBuffer = await input.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      // Asumir que es string/base64
      buffer = Buffer.from(input);
    }

    // Si no se especifica contentType, intentar detectarlo del key
    if (!contentType && key.includes(".")) {
      finalContentType = getMimeType(key);
    }

    const params: PutObjectCommandInput = {
      Bucket: requiredEnvVars.AWS_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: finalContentType,
      CacheControl: options.cacheControl || "public, max-age=31536000",
    };

    // Agregar metadata personalizada
    if (options.customMetadata) {
      params.Metadata = options.customMetadata;
    }

    await s3Client.send(new PutObjectCommand(params));

    const url = buildPublicUrl(key);
    return { success: true, url, key };
  } catch (error) {
    console.error("Error uploading to S3:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sube archivo a una ruta estructurada por marca/modelo
 */
export async function uploadModelFile(
  file: File | Buffer | Blob | string,
  fileName: string,
  brandName: string,
  modelName: string,
  fileType: FileType,
  options: UploadOptions = {},
): Promise<S3UploadResult> {
  const brandSlug = createSlug(brandName);
  const modelSlug = createSlug(modelName);

  let key = "";
  const finalFileName = generateFileName(fileName, options.addTimestamp);

  switch (fileType) {
    case "image":
      key = `models/${brandSlug}/${modelSlug}/img.webp`;
      break;
    case "image_small":
      key = `models/${brandSlug}/${modelSlug}/img_small.webp`;
      break;
    case "spec_sheet":
      key = `models/${brandSlug}/${modelSlug}/specsheet.pdf`;
      break;
    case "other":
      key = `models/${brandSlug}/${modelSlug}/others/${finalFileName}`;
      break;
  }

  const contentType = getMimeType(fileName);
  return uploadToS3(file, key, contentType, options);
}

/**
 * Sube archivo a una carpeta específica
 */
export async function uploadToFolder(
  file: File | Buffer | Blob | string,
  folderPath: string,
  fileName?: string,
  options: UploadOptions = {},
): Promise<S3UploadResult> {
  let finalFileName = fileName;

  if (!finalFileName && file instanceof File) {
    finalFileName = file.name;
  }

  if (!finalFileName) {
    throw new Error("fileName is required when not using File object");
  }

  finalFileName = generateFileName(finalFileName, options.addTimestamp);
  const key = `${folderPath}/${finalFileName}`;
  const contentType = getMimeType(finalFileName);

  return uploadToS3(file, key, contentType, options);
}

// ===========================
// FUNCIONES AUXILIARES
// ===========================

/**
 * Sube imagen principal de modelo
 */
export async function uploadModelImage(
  file: File | Buffer | Blob | string,
  brandName: string,
  modelName: string,
  options: UploadOptions = {},
): Promise<S3UploadResult> {
  return uploadModelFile(file, "img.webp", brandName, modelName, "image", options);
}

/**
 * Sube imagen miniatura de modelo
 */
export async function uploadModelThumbnail(
  file: File | Buffer | Blob | string,
  brandName: string,
  modelName: string,
  options: UploadOptions = {},
): Promise<S3UploadResult> {
  return uploadModelFile(file, "img_small.webp", brandName, modelName, "image_small", options);
}

/**
 * Sube PDF de especificaciones de modelo
 */
export async function uploadModelSpec(
  file: File | Buffer | Blob | string,
  brandName: string,
  modelName: string,
  options: UploadOptions = {},
): Promise<S3UploadResult> {
  const fileName = `${createSlug(modelName)}.pdf`;
  return uploadModelFile(file, fileName, brandName, modelName, "spec_sheet", options);
}

// ===========================
// GESTIÓN DE ARCHIVOS
// ===========================

/**
 * Elimina archivo de S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: requiredEnvVars.AWS_BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error("Error deleting from S3:", error);
    throw error;
  }
}

/**
 * Genera URL firmada para acceso temporal
 */
export async function getSignedUrl(
  key: string,
  operation: "get" | "put" = "get",
  expiresIn = 3600,
): Promise<SignedUrlResult> {
  try {
    // Extraer key si es una URL completa
    let cleanKey = key;
    if (key.includes("amazonaws.com")) {
      const urlParts = key.split(".amazonaws.com/");
      if (urlParts.length > 1) {
        cleanKey = urlParts[1].split("?")[0];
      }
    }

    const command =
      operation === "get"
        ? new GetObjectCommand({
            Bucket: requiredEnvVars.AWS_BUCKET_NAME,
            Key: cleanKey,
          })
        : new PutObjectCommand({
            Bucket: requiredEnvVars.AWS_BUCKET_NAME,
            Key: cleanKey,
            ContentType: "image/webp",
          });

    const signedUrl = await awsGetSignedUrl(s3Client, command, { expiresIn });
    return { success: { url: signedUrl } };
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return { failure: "Error interno al generar URL firmada" };
  }
}

// ===========================
// UTILIDADES DE CONFIGURACIÓN
// ===========================

/**
 * Verifica si la configuración de S3 es válida
 */
export async function validateS3Config(): Promise<{ valid: boolean; missing: string[] }> {
  const missing: string[] = [];

  if (!requiredEnvVars.AWS_ACCESS_KEY_ID) missing.push("AWS_ACCESS_KEY_ID");
  if (!requiredEnvVars.AWS_SECRET_ACCESS_KEY) missing.push("AWS_SECRET_ACCESS_KEY");

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Obtiene información de configuración actual
 */
export async function getS3Config(): Promise<{
  region: string;
  bucket: string;
  hasCloudFront: boolean;
  cloudFrontDomain: string | undefined;
}> {
  return {
    region: requiredEnvVars.AWS_REGION,
    bucket: requiredEnvVars.AWS_BUCKET_NAME,
    hasCloudFront: Boolean(process.env.AWS_CLOUDFRONT_DOMAIN),
    cloudFrontDomain: process.env.AWS_CLOUDFRONT_DOMAIN,
  };
}
