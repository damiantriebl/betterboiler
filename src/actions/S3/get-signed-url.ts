"use server";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_BUCKET_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

export async function getSignedURL({ name }: { name: string }) {
  const session = await auth.api.getSession({
    headers: await headers() 
  });
  if (!session) {
    return { failure: "No está autenticado" };
  }
  // Construimos la key usando el id del usuario y el nombre
  const key = session.user?.id + "/" + name + ".jpg";
  const putObjectCommand = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key,
  });
  
  const signedUrl = await getSignedUrl(s3, putObjectCommand, { expiresIn: 60 });
  console.log("Firma obtenida para", key);
  return { success: { url: signedUrl } };
}
