import { fixModelUpdatedAt } from './fix-model-updated-at.js';
import { setupCurrentAccountMethod } from './setup-current-account-method.js';
import { addActiveDaysToBankingPromotion } from './add-active-days-to-banking-promotion.js';

/**
 * Script centralizado para ejecutar todas las migraciones convertidas de SQL a TypeScript
 */
async function runAllMigrations() {
  console.log('🚀 Iniciando ejecución de migraciones con Prisma...');
  
  try {
    // Ejecutar cada migración en secuencia
    console.log('\n📝 Ejecutando migración: fix-model-updated-at');
    await fixModelUpdatedAt();
    
    console.log('\n📝 Ejecutando migración: setup-current-account-method');
    await setupCurrentAccountMethod();
    
    console.log('\n📝 Ejecutando migración: add-active-days-to-banking-promotion');
    await addActiveDaysToBankingPromotion();
    
    console.log('\n🎉 Todas las migraciones se han completado exitosamente.');
  } catch (error) {
    console.error('\n❌ Error durante la ejecución de migraciones:', error);
    process.exit(1);
  }
}

// Ejecutar si este archivo se ejecuta directamente
if (import.meta.url === new URL(import.meta.url).href) {
  runAllMigrations()
    .then(() => console.log('\n✨ Proceso completo'))
    .catch(error => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

export { runAllMigrations }; 