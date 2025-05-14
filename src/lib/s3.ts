import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

if (!process.env.AWS_BUCKET_REGION) {
  throw new Error("AWS_BUCKET_REGION is not defined");
}
if (!process.env.AWS_ACCESS_KEY_ID) {
  throw new Error("AWS_ACCESS_KEY_ID is not defined");
}
if (!process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error("AWS_SECRET_ACCESS_KEY is not defined");
}
if (!process.env.AWS_BUCKET_NAME) {
  throw new Error("AWS_BUCKET_NAME is not defined");
}

const s3Client = new S3Client({
  region: process.env.AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

interface FileUpload {
  buffer: Buffer;
  contentType?: string;
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

type S3UploadResult = S3UploadSuccess | S3UploadError;

export async function uploadToS3(
  input: File | Buffer | FileUpload,
  key: string,
  contentType?: string,
): Promise<S3UploadResult> {
  try {
    let buffer: Buffer;
    let finalContentType = contentType || "application/octet-stream";

    if (Buffer.isBuffer(input)) {
      buffer = input;
    } else if (input instanceof File) {
      const arrayBuffer = await input.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      finalContentType = input.type || finalContentType;
    } else {
      buffer = input.buffer;
      finalContentType = input.contentType || finalContentType;
    }

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: finalContentType,
      ACL: "public-read",
    });

    await s3Client.send(command);

    // Construir URL pública para acceder al objeto (usar CloudFront si está configurado)
    const bucketDomain =
      process.env.AWS_CLOUDFRONT_DOMAIN ||
      `${BUCKET_NAME}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com`;
    const url = `https://${bucketDomain}/${key}`;

    return { success: true, url, key };
  } catch (error) {
    console.error("Error uploading to S3:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function deleteFromS3(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error("Error deleting from S3:", error);
    throw error;
  }
}
