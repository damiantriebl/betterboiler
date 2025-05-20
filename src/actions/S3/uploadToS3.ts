"use server";

import { PutObjectCommand, S3Client, type PutObjectCommandInput } from "@aws-sdk/client-s3";
import type { ReadableStream } from "node:stream/web";

// Configuración básica del cliente S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// Función para determinar el tipo MIME basado en la extensión
const getMimeType = (fileName: string): string => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return "application/pdf";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "ppt":
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "zip":
      return "application/zip";
    case "txt":
      return "text/plain";
    case "csv":
      return "text/csv";
    case "html":
      return "text/html";
    case "js":
      return "application/javascript";
    case "json":
      return "application/json";
    case "xml":
      return "application/xml";
    default:
      return "application/octet-stream"; // Tipo genérico binario
  }
};

// Normalizar nombre de marca a slug para URL
const getBrandSlug = (brandName: string): string => {
  return brandName.toLowerCase().replace(/\s+/g, "-");
};

// Normalizar nombre de modelo a slug para URL
const getModelSlug = (modelName: string): string => {
  console.log("modelName", modelName);
  return modelName.toLowerCase().replace(/\s+/g, "-");
};

// Interfaz para los tipos de archivos que soportamos
export type FileType = "image" | "image_small" | "spec_sheet" | "other";

// Opciones para la subida de archivos
export interface UploadOptions {
  makeBucketPublic?: boolean;
  cacheControl?: string;
  customMetadata?: Record<string, string>;
}

/**
 * Sube un archivo a S3 con la configuración correcta de ContentType
 * @param file El archivo a subir (Buffer, Blob o ReadableStream)
 * @param fileName Nombre original del archivo (usado para determinar el ContentType)
 * @param brandName Nombre de la marca (ej: BMW, Honda)
 * @param modelName Nombre del modelo (ej: R 1250 RT)
 * @param fileType Tipo de archivo (image, image_small, spec_sheet, other)
 * @param options Opciones adicionales para la subida
 * @returns URL del archivo subido
 */
export async function uploadToS3(
  file: Buffer | Blob | string,
  fileName: string,
  brandName: string,
  modelName: string,
  fileType: FileType,
  options: UploadOptions = {},
): Promise<string> {
  // Convertir los nombres a slugs para la URL
  const brandSlug = getBrandSlug(brandName);
  const modelSlug = getModelSlug(modelName);

  // Determinar la ruta en S3 según el tipo de archivo y la nueva estructura
  let s3Key = "";

  switch (fileType) {
    case "image":
      s3Key = `models/${brandSlug}/${modelSlug}/img.webp`;
      break;
    case "image_small":
      s3Key = `models/${brandSlug}/${modelSlug}/img_small.webp`;
      break;
    case "spec_sheet":
      s3Key = `models/${brandSlug}/${modelSlug}/specsheet.pdf`;
      break;
    case "other":
      // Para otros archivos, usar la carpeta 'others' con el nombre original
      s3Key = `models/${brandSlug}/${modelSlug}/others/${fileName}`;
      break;
  }

  // Determinar el Content-Type correcto
  const contentType = getMimeType(fileName);

  try {
    // Parámetros para PutObjectCommand
    const params: PutObjectCommandInput = {
      Bucket: process.env.AWS_BUCKET_NAME || "uknapex",
      Key: s3Key,
      Body: file,
      ContentType: contentType,
      CacheControl: options.cacheControl || "max-age=31536000", // 1 año por defecto
    };

    // Agregar ACL si se especifica y el bucket lo soporta (eliminado por ahora)
    // if (options.makeBucketPublic) {
    //   params.ACL = "public-read";
    // }

    // Agregar metadata personalizada si se especifica
    if (options.customMetadata) {
      params.Metadata = options.customMetadata;
    }

    // Enviar el comando de subida
    await s3Client.send(new PutObjectCommand(params));

    // Construir y devolver la URL completa del archivo subido
    const bucketDomain =
      process.env.AWS_CLOUDFRONT_DOMAIN ||
      `${params.Bucket}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com`;
    return `https://${bucketDomain}/${s3Key}`;
  } catch (error) {
    console.error("Error al subir archivo a S3:", error);
    throw error;
  }
}

/**
 * Sube un archivo PDF a S3 (versión simplificada para fichas técnicas)
 */
export async function uploadPdf(
  file: Buffer | Blob | string,
  brandName: string,
  modelName: string,
): Promise<string> {
  const filename = `${getModelSlug(modelName)}.pdf`;
  return uploadToS3(file, filename, brandName, modelName, "spec_sheet");
}

/**
 * Sube una imagen principal a S3
 */
export async function uploadImage(
  file: Buffer | Blob | string,
  brandName: string,
  modelName: string,
): Promise<string> {
  return uploadToS3(file, "img.webp", brandName, modelName, "image");
}

/**
 * Sube una imagen en miniatura a S3
 */
export async function uploadThumbnail(
  file: Buffer | Blob | string,
  brandName: string,
  modelName: string,
): Promise<string> {
  return uploadToS3(file, "img_small.webp", brandName, modelName, "image_small");
}

/**
 * Sube un archivo genérico a S3 a una ruta (key) específica.
 * @param file El archivo a subir (Buffer, Blob o ReadableStream)
 * @param s3Key La ruta completa (key) donde se guardará el archivo en S3.
 * @param contentType El Content-Type del archivo (ej: "image/jpeg", "application/pdf").
 * @param options Opciones adicionales para la subida (ej: cacheControl).
 * @returns URL del archivo subido.
 */
export async function uploadGenericFileToS3(
  file: Buffer | Blob | string,
  s3Key: string,
  contentType: string,
  options: UploadOptions = {},
): Promise<string> {
  try {
    const params: PutObjectCommandInput = {
      Bucket: process.env.AWS_BUCKET_NAME || "uknapex",
      Key: s3Key,
      Body: file,
      ContentType: contentType,
      CacheControl: options.cacheControl || "public-read, max-age=31536000",
      // ACL: options.makeBucketPublic !== undefined ? (options.makeBucketPublic ? "public-read" : undefined) : "public-read", // Eliminado
    };

    if (options.customMetadata) {
      params.Metadata = options.customMetadata;
    }

    await s3Client.send(new PutObjectCommand(params));

    const bucketDomain =
      process.env.AWS_CLOUDFRONT_DOMAIN ||
      `${params.Bucket}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com`;
    
    // Si se usa CloudFront, es preferible no incluir el nombre del bucket en la ruta si CloudFront está configurado para el bucket raíz.
    // Pero para S3 directo, sí se necesita. La URL base actual es correcta para S3 directo o CloudFront apuntando al bucket.
    return `https://${bucketDomain}/${s3Key}`;

  } catch (error) {
    console.error("Error al subir archivo genérico a S3:", error);
    // Asegúrate de que el error se propague para que la función que llama pueda manejarlo.
    if (error instanceof Error) {
      throw new Error(`Error al subir a S3: ${error.message}`);
    }
    throw new Error("Error desconocido al subir archivo genérico a S3.");
  }
}
