import { PrismaClient } from "@prisma/client";

/**
 * Script para actualizar los valores nulos de updatedAt a que coincidan con createdAt en el modelo Model
 * Reemplaza el SQL:
 * UPDATE "Model" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
 */
export async function fixModelUpdatedAt() {
  const prisma = new PrismaClient();

  try {
    console.log("🔍 Buscando registros de Model con updatedAt nulos...");

    // Primero obtenemos todos los modelos con updatedAt null
    // En Prisma no podemos consultar directamente null, así que usamos un método alternativo
    const allModels = await prisma.model.findMany({
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Filtrar manualmente los que tienen updatedAt null o undefined
    const modelsToFix = allModels.filter(
      (model) => model.updatedAt === null || model.updatedAt === undefined,
    );

    console.log(`📊 Encontrados ${modelsToFix.length} registros para actualizar`);

    if (modelsToFix.length === 0) {
      console.log("✅ No hay registros que necesiten actualización");
      return;
    }

    // Actualizar cada registro individualmente
    let updatedCount = 0;
    for (const model of modelsToFix) {
      await prisma.model.update({
        where: { id: model.id },
        data: { updatedAt: model.createdAt },
      });
      updatedCount++;
    }

    console.log(`✅ Actualizados ${updatedCount} registros correctamente`);
  } catch (error) {
    console.error("❌ Error al actualizar los registros:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la función si este archivo se ejecuta directamente
if (import.meta.url === new URL(import.meta.url).href) {
  fixModelUpdatedAt()
    .then(() => console.log("✨ Proceso completado"))
    .catch((error) => {
      console.error("❌ Error en el proceso:", error);
      process.exit(1);
    });
}
