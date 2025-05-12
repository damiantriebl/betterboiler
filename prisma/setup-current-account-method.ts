import { PrismaClient } from '@prisma/client';

/**
 * Script para configurar el método de pago Cuenta Corriente y habilitarlo para todas las organizaciones
 * Reemplaza el SQL en migrations/add_current_account_method/migration.sql
 */
export async function setupCurrentAccountMethod() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Verificando si existe el método de pago Cuenta Corriente...');

    // Buscar si ya existe el método de pago cuenta corriente
    let paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        type: 'current_account'
      }
    });

    // Si no existe, crearlo
    if (!paymentMethod) {
      paymentMethod = await prisma.paymentMethod.create({
        data: {
          name: 'Cuenta Corriente',
          type: 'current_account',
          description: 'Pago con cuenta corriente financiada',
          iconUrl: '/icons/payment-methods/current-account.svg'
        }
      });
      console.log('✅ Método de pago Cuenta Corriente creado:', paymentMethod.id);
    } else {
      console.log('ℹ️ El método de pago Cuenta Corriente ya existe (ID:', paymentMethod.id, ')');
    }

    // Obtener todas las organizaciones
    const organizations = await prisma.organization.findMany();
    console.log(`📊 Procesando ${organizations.length} organizaciones...`);

    // Para cada organización, verificar si el método está habilitado
    let enabledCount = 0;
    for (const org of organizations) {
      // Verificar si ya existe la relación
      const existingRelation = await prisma.organizationPaymentMethod.findFirst({
        where: {
          organizationId: org.id,
          methodId: paymentMethod.id
        }
      });

      if (!existingRelation) {
        // Obtener el orden más alto existente para esa organización
        const highestOrder = await prisma.organizationPaymentMethod.findFirst({
          where: { organizationId: org.id },
          orderBy: { order: 'desc' },
          select: { order: true }
        });

        const newOrder = (highestOrder?.order || 0) + 1;

        // Crear la relación
        await prisma.organizationPaymentMethod.create({
          data: {
            organizationId: org.id,
            methodId: paymentMethod.id,
            isEnabled: true,
            order: newOrder
          }
        });
        enabledCount++;
      }
    }

    console.log(`✅ Método de pago habilitado para ${enabledCount} organizaciones`);
  } catch (error) {
    console.error('❌ Error al configurar el método de pago Cuenta Corriente:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la función si este archivo se ejecuta directamente
if (import.meta.url === new URL(import.meta.url).href) {
  setupCurrentAccountMethod()
    .then(() => console.log('✨ Proceso completado'))
    .catch((error) => {
      console.error('❌ Error en el proceso:', error);
      process.exit(1);
    });
} 