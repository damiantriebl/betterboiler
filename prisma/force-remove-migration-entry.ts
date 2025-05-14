import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function deleteProblematicMigration() {
  const migrationName = "add_current_account_method";
  try {
    const result = await prisma.$executeRawUnsafe(
      `DELETE FROM "_prisma_migrations" WHERE "id" LIKE CONCAT('%', $1::text, '%')`,
      migrationName,
    );
    if (result > 0) {
      console.log(
        `✅ Se eliminaron ${result} entradas de la migración problemática '${migrationName}' de la tabla _prisma_migrations.`,
      );
    } else {
      console.log(
        `ℹ️ No se encontró la migración '${migrationName}' en la tabla _prisma_migrations o ya fue eliminada.`,
      );
    }
  } catch (error) {
    console.error(`❌ Error al intentar eliminar la migración '${migrationName}':`, error);
    console.log(
      "Es posible que la tabla _prisma_migrations no exista si ninguna migración se ha aplicado nunca después de un reset fallido.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

deleteProblematicMigration();
