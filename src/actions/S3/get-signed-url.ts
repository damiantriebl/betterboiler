"use server";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_BUCKET_REGION ?? "",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

type SignedUrlParams = {
  name: string;
  operation: "put" | "get";
};

type SignedUrlResult = 
  | { success: { url: string } }
  | { failure: string };

export async function getSignedS3Url({ name, operation }: SignedUrlParams): Promise<SignedUrlResult> {
  try {
    // Verificar autenticación
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return { failure: "No está autenticado" };
    }

    // Extraer key si es una URL de S3
    let key = name;
    if (name.includes("amazonaws.com")) {
      const urlParts = name.split(".amazonaws.com/");
      if (urlParts.length > 1) {
        key = urlParts[1].split("?")[0];
      }
    }

    // Verificar que tenemos un bucket configurado
    const bucket = process.env.AWS_BUCKET_NAME;
    if (!bucket) {
      return { failure: "Bucket no configurado" };
    }

    // Generar URL firmada según la operación
    const command = operation === "get"
      ? new GetObjectCommand({ Bucket: bucket, Key: key })
      : new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          ContentType: "image/webp",
        });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 60 }); // 1 hora
    return { success: { url: signedUrl } };

  } catch (error) {
    console.error("Error generating signed URL:", error);
    return { failure: "Error interno al generar URL firmada" };
  }
}
