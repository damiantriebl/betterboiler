import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import sharp from "sharp";
import { uploadBufferToS3 } from "@/actions/S3/upload-buffer-to-s3";
import { type ModelFileWithUrl } from "@/types/motorcycle";

interface ModelFile {
  id: string;
  name: string;
  url: string;
  type: string;
  s3Key: string;
  s3KeySmall: string | null;
  size: number;
  modelId: number;
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to process image files
async function processImage(file: File): Promise<{ original: Buffer; thumbnail: Buffer }> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Process original image
  const original = await sharp(buffer)
    .webp({ quality: 90 })
    .toBuffer();

  // Create thumbnail
  const thumbnail = await sharp(buffer)
    .resize(300, 300, { fit: "inside" })
    .webp({ quality: 80 })
    .toBuffer();

  return {
    original,
    thumbnail,
  };
}

export async function GET(
  request: NextRequest,
  context: { params: { modelId: string } }
) {
  try {
    const modelId = parseInt(context.params.modelId);
    if (isNaN(modelId)) {
      return NextResponse.json(
        { error: "ID de modelo inválido" },
        { status: 400 }
      );
    }

    // Primero verificamos que el modelo existe
    const model = await prisma.model.findUnique({
      where: { id: modelId },
      include: {
        files: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            type: true,
            s3Key: true,
            s3KeySmall: true,
            size: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      }
    });

    console.log('Found model:', model);

    if (!model) {
      return NextResponse.json(
        { error: "Modelo no encontrado" },
        { status: 404 }
      );
    }

    // Transformar los archivos para incluir la URL
    const filesWithUrl: ModelFileWithUrl[] = model.files.map(file => {
      const url = file.s3Key ? `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/${file.s3Key}` : "";
      console.log('Generated URL for file:', { fileId: file.id, s3Key: file.s3Key, url });
      return {
        ...file,
        url,
      };
    });

    console.log('Transformed files:', filesWithUrl);

    // Devolvemos los archivos del modelo
    return NextResponse.json({ files: filesWithUrl });

  } catch (error) {
    console.error("Error fetching model files:", error);
    return NextResponse.json(
      { error: "Error al obtener archivos" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { modelId: string } }
) {
  try {
    const modelId = parseInt(context.params.modelId);
    if (isNaN(modelId)) {
      return NextResponse.json(
        { error: "ID de modelo inválido" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const brandName = formData.get("brandName") as string;

    console.log('Received file upload request:', { 
      modelId, 
      brandName,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size 
    });

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo" },
        { status: 400 }
      );
    }

    let uploadResult;
    let thumbnailPath: string | null = null;
    const basePath = `models/${brandName}/${modelId}`;
    const fileSize = file.size;

    console.log('Processing file:', { basePath, fileSize });

    if (file.type.startsWith("image/")) {
      // Process image files
      console.log('Processing image file');
      const { original, thumbnail } = await processImage(file);
      const originalPath = `${basePath}/original/${file.name}`;
      thumbnailPath = `${basePath}/thumbnail/${file.name}`;
      
      console.log('Uploading image files:', { originalPath, thumbnailPath });
      
      // Upload both versions
      const [originalUpload, thumbnailUpload] = await Promise.all([
        uploadBufferToS3({ buffer: original, path: originalPath }),
        uploadBufferToS3({ buffer: thumbnail, path: thumbnailPath })
      ]);

      console.log('Upload results:', { originalUpload, thumbnailUpload });

      if (!originalUpload.success || !thumbnailUpload.success) {
        throw new Error("Error al subir archivo a S3");
      }

      uploadResult = {
        success: true,
        path: originalPath,
        url: originalUpload.url
      };
    } else {
      // Upload non-image files directly
      const path = `${basePath}/${file.type === "application/pdf" ? "specs" : "others"}/${file.name}`;
      console.log('Uploading non-image file:', { path });
      
      const buffer = Buffer.from(await file.arrayBuffer());
      uploadResult = await uploadBufferToS3({ buffer, path });

      console.log('Upload result:', uploadResult);

      if (!uploadResult.success) {
        throw new Error("Error al subir archivo a S3");
      }
    }

    if (!uploadResult.success || !uploadResult.url || !uploadResult.path) {
      throw new Error("Error al subir archivo: Falta URL o path");
    }

    // Create file record in database
    console.log('Creating database record:', {
      name: file.name,
      type: file.type,
      s3Key: uploadResult.path,
      s3KeySmall: thumbnailPath,
      size: fileSize,
      modelId,
    });

    const modelFile = await prisma.modelFile.create({
      data: {
        name: file.name,
        url: uploadResult.url,
        type: file.type,
        s3Key: uploadResult.path,
        s3KeySmall: thumbnailPath,
        size: fileSize,
        modelId,
      },
    });

    console.log('Created model file:', modelFile);

    return NextResponse.json({ file: modelFile });
  } catch (error) {
    console.error("Error uploading model file:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al subir archivo" },
      { status: 500 }
    );
  }
} 