import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  try {
    // Ejecutar el SQL directamente
    const result = await prisma.$executeRawUnsafe(
      `DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20250502162636_add_payment_cards'`,
    );

    console.log(`Registros eliminados: ${result}`);
    console.log("Migración duplicada eliminada correctamente");
  } catch (e) {
    console.error("Error al ejecutar SQL:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
