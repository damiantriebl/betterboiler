/**
 * This script demonstrates the proper way to fetch motorcycles with their
 * model files using Prisma. It can be used as a reference or template for
 * creating similar queries in your application.
 *
 * Run with: pnpm ts-node src/scripts/update-model-files-relations.ts
 */

import prisma from "@/lib/prisma";

async function main() {
  console.log("Fetching motorcycles with model files...");

  // Example 1: Fetch all motorcycles with their model files
  const motorcycles = await prisma.motorcycle.findMany({
    include: {
      brand: true,
      model: {
        include: {
          // Include the files relationship
          files: true,
        },
      },
      color: true,
      branch: true,
    },
    take: 5, // Limit to 5 for demonstration
  });

  console.log(`Found ${motorcycles.length} motorcycles`);

  // Print some sample data
  for (const motorcycle of motorcycles) {
    console.log(`\nMotorcycle ID: ${motorcycle.id}`);
    console.log(`Model: ${motorcycle.brand?.name} ${motorcycle.model?.name}`);

    const files = motorcycle.model?.files || [];
    console.log(`Model has ${files.length} files:`);

    // Show files grouped by type
    const imageFiles = files.filter((f) => f.type === "image" || f.type.startsWith("image/"));
    const pdfFiles = files.filter((f) => f.type === "application/pdf");
    const otherFiles = files.filter(
      (f) => !f.type.startsWith("image/") && f.type !== "image" && f.type !== "application/pdf",
    );

    console.log(`- ${imageFiles.length} images`);
    console.log(`- ${pdfFiles.length} PDF documents`);
    console.log(`- ${otherFiles.length} other files`);
  }

  // Example 2: Fetch motorcycles and count their model files by type
  const modelFileCounts = await prisma.model.findMany({
    select: {
      id: true,
      name: true,
      brand: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          files: true,
        },
      },
      files: {
        select: {
          type: true,
        },
      },
    },
    where: {
      // Only include models that have files
      files: {
        some: {},
      },
    },
  });

  console.log("\n\nModels with file counts:");
  for (const model of modelFileCounts) {
    console.log(`${model.brand.name} ${model.name}: ${model._count.files} files`);

    // Count files by type
    const types = model.files.reduce(
      (acc, file) => {
        acc[file.type] = (acc[file.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    Object.entries(types).forEach(([type, count]) => {
      console.log(`- ${type}: ${count}`);
    });
  }
}

main()
  .then(() => console.log("Done!"))
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
