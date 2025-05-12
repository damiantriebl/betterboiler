import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updatePaymentMethodsOrder() {
  try {
    // Obtener todas las organizaciones
    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true }
    });

    if (organizations.length === 0) {
      console.log('No se encontraron organizaciones.');
      return;
    }

    // Para cada organización, actualizar el orden de los métodos de pago
    for (const org of organizations) {
      console.log(`\nActualizando orden para organización: ${org.name} (${org.id})`);
      
      // Obtener todos los métodos de pago para esta organización
      const methods = await prisma.organizationPaymentMethod.findMany({
        where: { organizationId: org.id },
        include: { method: true },
        orderBy: { id: 'asc' } // Ordenamos por ID para mantener el orden aproximado de creación
      });
      
      console.log(`Se encontraron ${methods.length} métodos de pago`);
      
      // Actualizar el orden de cada método de pago
      for (let i = 0; i < methods.length; i++) {
        const method = methods[i];
        
        console.log(`Actualizando método ${method.method.name} (${method.method.type}) a orden ${i}`);
        
        await prisma.organizationPaymentMethod.update({
          where: { id: method.id },
          data: { order: i }
        });
      }
      
      // Verificar que los cambios se hayan aplicado
      const updatedMethods = await prisma.organizationPaymentMethod.findMany({
        where: { organizationId: org.id },
        include: { method: true },
        orderBy: { order: 'asc' }
      });
      
      console.log(`\nMétodos de pago actualizados para organización ${org.name}:`);
      updatedMethods.forEach(m => {
        console.log(`- ${m.method.name} (${m.method.type}): order=${m.order}, isEnabled=${m.isEnabled}`);
      });
    }

    console.log('\nProceso completado.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePaymentMethodsOrder(); 