"use server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { serverMessage } from "@/types/ServerMessageType";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import { uploadBufferToS3 } from "@/actions/S3/upload-buffer-to-s3";

export async function createOrUpdateOrganization(formData: FormData): Promise<serverMessage> {
  const id = formData.get("id") as string | null;
  const name = formData.get("name") as string | null;
  const logoFile = formData.get("logoFile") as File | null;

  if (!name) return { error: "El nombre es requerido.", success: false };

  try {
    let logoUrl: string | undefined;

    if (logoFile) {
      const buffer = Buffer.from(await logoFile.arrayBuffer());
      const sizes = [400, 200, 100];

      await Promise.all(
        sizes.map(async (size) => {
          const resizedBuffer = await sharp(buffer)
            .resize({ width: size, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

          await uploadBufferToS3({
            buffer: resizedBuffer,
            path: `organization/${id ?? "new"}/logo_${size}`,
            contentType: "image/webp",
          });
        })
      );

      logoUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/organization/${id ?? "new"}/logo_400`;
    }

    if (id) {
      await prisma.organization.update({
        where: { id },
        data: { name, ...(logoUrl && { logo: logoUrl }) },
      });
      revalidatePath("/root");
      return { success: "Organización actualizada con éxito.", error: false };
    }

    let slug = name.toLowerCase().replace(/ /g, "-");
    let exists = await prisma.organization.findUnique({ where: { slug } });
    if (exists) slug += `-${uuidv4().slice(0, 8)}`;

    const org = await prisma.organization.create({ data: { name, slug } });

    if (logoFile) {
      logoUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/organization/${org.id}/logo_400`;

      await prisma.organization.update({
        where: { id: org.id },
        data: { logo: logoUrl },
      });
    }

    revalidatePath("/root");
    return { success: "Organización creada con éxito.", error: false };

  } catch (error) {
    console.error("🔥 ERROR SERVER ACTION:", error);
    return { error: (error as Error).message || "Ocurrió un error inesperado.", success: false };
  }
}
