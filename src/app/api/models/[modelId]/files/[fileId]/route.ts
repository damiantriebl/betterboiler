import prisma from "@/lib/prisma";
import { deleteFromS3 } from "@/lib/s3";
import { type NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  context: { params: { modelId: string; fileId: string } },
) {
  try {
    const modelId = Number.parseInt(context.params.modelId);

    if (Number.isNaN(modelId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Get file info before deleting
    const file = await prisma.modelFile.findUnique({
      where: { id: context.params.fileId },
    });

    if (!file) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    // Delete from S3
    await deleteFromS3(file.s3Key);

    // If it's an image, also delete the thumbnail
    if (file.s3KeySmall) {
      await deleteFromS3(file.s3KeySmall);
    }

    // Delete from database
    await prisma.modelFile.delete({
      where: { id: file.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting model file:", error);
    return NextResponse.json({ error: "Error al eliminar archivo" }, { status: 500 });
  }
}
