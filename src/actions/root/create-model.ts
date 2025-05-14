"use server";

import prisma from "@/lib/prisma";
import { uploadToS3 } from "@/lib/s3-upload";
import { revalidatePath } from "next/cache";

type ModelInput = {
  name: string;
  brandId: number;
  pathToRevalidate?: string;
};

export const createModel = async (input: ModelInput | FormData) => {
  try {
    let name: string;
    let brandId: number;
    let pathToRevalidate = "/configuration";
    let productImage: File | null = null;
    let specSheet: File | null = null;
    const additionalFiles: File[] = [];

    // Handle both FormData and direct object input
    if (input instanceof FormData) {
      name = input.get("name") as string;
      brandId = Number(input.get("brandId"));

      if (input.has("pathToRevalidate")) {
        pathToRevalidate = input.get("pathToRevalidate") as string;
      }

      // Handle file uploads
      if (input.has("productImage")) {
        productImage = input.get("productImage") as File;
      }

      if (input.has("specSheet")) {
        specSheet = input.get("specSheet") as File;
      }

      // Handle multiple additional files
      for (let i = 0; input.has(`additionalFile${i}`); i++) {
        additionalFiles.push(input.get(`additionalFile${i}`) as File);
      }
    } else {
      // Regular object input
      name = input.name;
      brandId = input.brandId;
      if (input.pathToRevalidate) {
        pathToRevalidate = input.pathToRevalidate;
      }
    }

    // Upload files to S3 if present
    const uploadResults = {
      imageUrl: null as string | null,
      specSheetUrl: null as string | null,
      additionalFiles: [] as { url: string; name: string; type: string }[],
    };

    if (productImage) {
      const result = await uploadToS3(productImage, `models/${brandId}/images`);
      if (result.success) {
        uploadResults.imageUrl = result.url;
      }
    }

    if (specSheet) {
      const result = await uploadToS3(specSheet, `models/${brandId}/specs`);
      if (result.success) {
        uploadResults.specSheetUrl = result.url;
      }
    }

    for (const file of additionalFiles) {
      const result = await uploadToS3(file, `models/${brandId}/additional`);
      if (result.success) {
        uploadResults.additionalFiles.push({
          url: result.url,
          name: file.name,
          type: file.type,
        });
      }
    }

    // Create the model with file URLs
    const model = await prisma.model.create({
      data: {
        name,
        brandId,
        imageUrl: uploadResults.imageUrl,
        specSheetUrl: uploadResults.specSheetUrl,
        // Store additional files as JSON in the database
        additionalFilesJson:
          uploadResults.additionalFiles.length > 0
            ? JSON.stringify(uploadResults.additionalFiles)
            : null,
      },
    });

    // Format the result to include file information
    const result = {
      ...model,
      additionalFiles: uploadResults.additionalFiles,
    };

    revalidatePath(pathToRevalidate);
    return { success: true, model: result };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "El modelo ya existe para esta marca." };
    }
    return { success: false, error: error.message || "Error al crear modelo." };
  }
};
