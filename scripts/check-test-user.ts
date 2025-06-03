import prisma from '../src/lib/prisma';

const TEST_USER_EMAIL = 'damianplay@gmail.com';

async function checkTestUser() {
  console.log('🔍 Verificando usuario de test en la base de datos...');
  console.log(`📧 Email: ${TEST_USER_EMAIL}`);
  
  try {
    // Buscar el usuario
    const user = await prisma.user.findUnique({
      where: {
        email: TEST_USER_EMAIL,
      },
      include: {
        sessions: {
          take: 3,
          orderBy: {
            createdAt: 'desc'
          }
        },
        accounts: true,
      }
    });
    
    if (user) {
      console.log('✅ Usuario encontrado:');
      console.log(`   - ID: ${user.id}`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Nombre: ${user.name || 'Sin nombre'}`);
      console.log(`   - Email verificado: ${user.emailVerified ? '✅' : '❌'}`);
      console.log(`   - Creado: ${user.createdAt}`);
      console.log(`   - Actualizado: ${user.updatedAt}`);
      console.log(`   - Sesiones activas: ${user.sessions.length}`);
      
      if (user.sessions.length > 0) {
        console.log('📱 Sesiones recientes:');
        user.sessions.forEach((session, index) => {
          console.log(`   ${index + 1}. ID: ${session.id}, Expira: ${session.expiresAt}`);
        });
      }
      
      if (user.accounts.length > 0) {
        console.log('🔗 Cuentas conectadas:');
        user.accounts.forEach((account, index) => {
          console.log(`   ${index + 1}. Proveedor: ${account.providerId}, ID: ${account.id}`);
        });
      }
      
      // Verificar si el usuario tiene organización
      if (user.organizationId) {
        const organization = await prisma.organization.findUnique({
          where: {
            id: user.organizationId,
          }
        });
        
        console.log(`🏢 Organización: ${organization?.name || 'Nombre no disponible'}`);
        console.log(`   - ID: ${user.organizationId}`);
        console.log(`   - Rol del usuario: ${user.role}`);
      } else {
        console.log('🏢 Sin organización asignada');
      }
      
    } else {
      console.log('❌ Usuario NO encontrado en la base de datos');
      console.log('💡 Necesitas crear el usuario primero');
      
      // Sugerir cómo crear el usuario
      console.log('\n🆕 Para crear el usuario, puedes:');
      console.log('   1. Ir a http://localhost:3000/sign-up');
      console.log('   2. Registrarte con:');
      console.log(`      - Email: ${TEST_USER_EMAIL}`);
      console.log('      - Password: 123456789');
      console.log('   3. O ejecutar: pnpm run test:create-user');
    }
    
  } catch (error) {
    console.error('❌ Error verificando usuario:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTestUser(); 