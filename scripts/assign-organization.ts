import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignOrganizationToUser() {
  try {
    console.log('🔍 Buscando usuarios sin organización...');
    
    // Buscar usuarios sin organización
    const usersWithoutOrg = await prisma.user.findMany({
      where: {
        organizationId: null
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    console.log(`📊 Usuarios sin organización encontrados: ${usersWithoutOrg.length}`);
    usersWithoutOrg.forEach(user => {
      console.log(`  - ${user.email} (${user.name}) - Rol: ${user.role}`);
    });

    if (usersWithoutOrg.length === 0) {
      console.log('✅ Todos los usuarios ya tienen organización asignada');
      return;
    }

    // Buscar organizaciones existentes
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        slug: true
      }
    });

    console.log(`📊 Organizaciones disponibles: ${organizations.length}`);
    organizations.forEach(org => {
      console.log(`  - ${org.name} (${org.slug})`);
    });

    let targetOrganization;

    if (organizations.length === 0) {
      // Crear organización por defecto si no existe ninguna
      console.log('🏢 Creando organización por defecto...');
      targetOrganization = await prisma.organization.create({
        data: {
          name: 'Organización Principal',
          slug: 'organizacion-principal'
        }
      });
      console.log(`✅ Organización creada: ${targetOrganization.name}`);
    } else {
      // Usar la primera organización existente
      targetOrganization = organizations[0];
      console.log(`🎯 Usando organización existente: ${targetOrganization.name}`);
    }

    // Asignar la organización a todos los usuarios sin organización
    console.log('🔄 Asignando organización a usuarios...');
    
    for (const user of usersWithoutOrg) {
      await prisma.user.update({
        where: { id: user.id },
        data: { organizationId: targetOrganization.id }
      });
      console.log(`✅ Usuario ${user.email} asignado a ${targetOrganization.name}`);
    }

    console.log('🎉 ¡Proceso completado exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar directamente
assignOrganizationToUser()
  .then(() => {
    console.log('✅ Script ejecutado correctamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  });

export { assignOrganizationToUser }; 