import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_BUCKET_REGION ?? "",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

interface UploadBufferToS3Params {
  buffer: Buffer;
  path: string;
}

export async function uploadBufferToS3({ buffer, path }: UploadBufferToS3Params) {
  console.log("Uploading buffer to S3 path:", path);
  try {
    const bucketName = process.env.AWS_BUCKET_NAME;
    const region = process.env.AWS_BUCKET_REGION;

    if (!bucketName || !region) {
      console.error("Missing S3 configuration:", { bucketName, region });
      throw new Error("Missing S3 configuration");
    }

    console.log("Using S3 configuration:", { bucketName, region });

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: path,
        Body: buffer,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000",
      }),
    );

    const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${path}`;
    console.log("Buffer uploaded successfully to:", publicUrl);
    return { success: true, path, url: publicUrl };
  } catch (error) {
    console.error("Error uploading buffer to S3:", error);
    return { success: false, error: (error as Error).message };
  }
}
