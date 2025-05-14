import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_BUCKET_REGION ?? "",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

type UploadToS3Result = {
  success: boolean;
  url?: string;
  error?: string;
};

/**
 * Uploads a file to S3 and returns the URL
 * @param file The file to upload
 * @param path The folder path inside the S3 bucket (without filename)
 * @returns Object with success status and URL or error
 */
export async function uploadToS3(file: File, path: string): Promise<UploadToS3Result> {
  try {
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // Generate a unique filename by combining the original name with timestamp
    const timestamp = Date.now();
    const extension = file.name.split(".").pop();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9-_.]/g, "-").toLowerCase();
    const filename = `${cleanFileName.split(".")[0]}-${timestamp}.${extension}`;

    // Complete path with filename
    const fullPath = `${path}/${filename}`;

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME ?? "",
        Key: fullPath,
        Body: buffer,
        ContentType: file.type,
        CacheControl: "public, max-age=31536000",
      }),
    );

    // Generate public URL
    const publicUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/${fullPath}`;

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error("Error uploading to S3:", error);
    return { success: false, error: (error as Error).message };
  }
}
