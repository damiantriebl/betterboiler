import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('🔐 Creando usuario de prueba para tests de performance...');
    
    const email = 'damianplay@gmail.com';
    
    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      console.log('✅ Usuario de prueba ya existe');
      console.log('ℹ️  Para actualizar contraseña, usar better-auth directamente');
      return;
    }
    
    // Crear organización primero
    const organization = await prisma.organization.create({
      data: {
        name: 'Test Organization',
        slug: 'test-org-performance'
      }
    });
    
    console.log(`✅ Organización creada: ${organization.name}`);
    
    // Crear el usuario asociado a la organización
    const user = await prisma.user.create({
      data: {
        email,
        name: 'Test User Performance',
        emailVerified: true,
        role: 'admin',
        organizationId: organization.id
      }
    });
    
    console.log(`✅ Usuario creado: ${user.email}`);
    console.log('🎯 Setup de usuario de prueba completado!');
    console.log('ℹ️  Las credenciales se configuran a través de better-auth');
    
  } catch (error) {
    console.error('❌ Error creando usuario de prueba:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createTestUser()
    .then(() => {
      console.log('\n🎉 Usuario de prueba listo para tests!');
      console.log('📝 Nota: Debes crear las credenciales manualmente usando la interfaz de registro');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

export { createTestUser }; 