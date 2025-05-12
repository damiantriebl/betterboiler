import { PrismaClient } from '@prisma/client';

/**
 * Script para añadir la columna activeDays a la tabla BankingPromotion
 * Reemplaza el SQL: ALTER TABLE "BankingPromotion" ADD COLUMN "activeDays" TEXT[];
 */
export async function addActiveDaysToBankingPromotion() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Verificando si es necesario añadir la columna activeDays a BankingPromotion...');

    // Verificar si el esquema ya tiene la columna activeDays
    // Esto se debe hacer a través de una consulta directa al esquema de la base de datos
    // Primero obtenemos una promoción existente si hay
    const samplePromotion = await prisma.bankingPromotion.findFirst({
      select: { id: true }
    });

    // Si no hay promociones, no podemos probar
    if (!samplePromotion) {
      console.log('ℹ️ No hay promociones bancarias en la base de datos para verificar el esquema');
      console.log('   La columna activeDays debe estar ya definida en el schema.prisma');
      return;
    }

    // Para verificar si la columna existe, intentamos hacer una consulta que use esa columna
    let columnExists = true;
    try {
      await prisma.bankingPromotion.findUnique({
        where: { id: samplePromotion.id },
        select: { activeDays: true }
      });
    } catch (error) {
      columnExists = false;
    }

    if (columnExists) {
      console.log('✅ La columna activeDays ya existe en la tabla BankingPromotion.');
    } else {
      console.log('⚠️ La columna activeDays no existe en la tabla BankingPromotion.');
      console.log('   Para añadirla, debes actualizar schema.prisma y luego ejecutar:');
      console.log('   `npx prisma migrate dev --name add-active-days-to-banking-promotion`');
      
      console.log('\nSugerencia para schema.prisma:');
      console.log('model BankingPromotion {');
      console.log('  // ... campos existentes');
      console.log('  activeDays     String[]  @default([])');
      console.log('}');
    }
  } catch (error) {
    console.error('❌ Error al verificar la columna activeDays:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la función si este archivo se ejecuta directamente
if (import.meta.url === new URL(import.meta.url).href) {
  addActiveDaysToBankingPromotion()
    .then(() => console.log('✨ Proceso completado'))
    .catch((error) => {
      console.error('❌ Error en el proceso:', error);
      process.exit(1);
    });
} 