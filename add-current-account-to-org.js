import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function addCurrentAccountToOrganization() {
  try {
    // Obtener todas las organizaciones
    const organizations = await prisma.organization.findMany({
      select: { id: true }
    });

    if (organizations.length === 0) {
      console.log('No se encontraron organizaciones.');
      return;
    }

    // Encontrar el método de pago de Cuenta Corriente
    const currentAccountMethod = await prisma.paymentMethod.findFirst({
      where: { type: 'current_account' }
    });

    if (!currentAccountMethod) {
      console.log('No se encontró el método de pago "Cuenta Corriente".');
      return;
    }

    console.log(`Método de pago encontrado: ${currentAccountMethod.name} (ID: ${currentAccountMethod.id})`);

    // Para cada organización, verificar si ya tiene el método de pago
    for (const org of organizations) {
      const existingAssociation = await prisma.organizationPaymentMethod.findFirst({
        where: {
          organizationId: org.id,
          methodId: currentAccountMethod.id
        }
      });

      if (existingAssociation) {
        console.log(`La organización ${org.id} ya tiene el método de pago asociado.`);
        continue;
      }

      // Obtener el máximo order para esta organización
      const maxOrderResult = await prisma.organizationPaymentMethod.aggregate({
        where: { organizationId: org.id },
        _max: { order: true }
      });
      
      const nextOrder = (maxOrderResult._max.order || 0) + 1;

      // Crear la asociación
      await prisma.organizationPaymentMethod.create({
        data: {
          organizationId: org.id,
          methodId: currentAccountMethod.id,
          isEnabled: true,
          order: nextOrder
        }
      });

      console.log(`Método de pago "Cuenta Corriente" agregado a la organización ${org.id}.`);
    }

    console.log('Proceso completado.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addCurrentAccountToOrganization(); 