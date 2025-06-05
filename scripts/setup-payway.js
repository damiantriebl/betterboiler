#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupPayway() {
  console.log('🚀 Configurando PayWay...');

  try {
    // 1. Crear o actualizar el método de pago PayWay
    const paymentMethod = await prisma.paymentMethod.upsert({
      where: { type: 'payway' },
      update: {},
      create: {
        name: 'PayWay',
        type: 'payway',
        description: 'Sistema de pagos PayWay para servicios y productos',
        iconUrl: null, // Puedes agregar la URL del logo de PayWay aquí
      },
    });

    console.log('✅ Método de pago PayWay creado/actualizado:', paymentMethod);

    // 2. Solicitar la organización a configurar
    const organizationId = process.argv[2];
    if (!organizationId) {
      console.log('❌ Error: Debes proporcionar el ID de la organización');
      console.log('Uso: node scripts/setup-payway.js [ORGANIZATION_ID]');
      console.log('');
      console.log('Para encontrar tu ID de organización, ejecuta:');
      console.log('npx prisma studio');
      console.log('Y busca en la tabla Organization');
      process.exit(1);
    }

    // 3. Verificar que la organización existe
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      console.log(`❌ Error: No se encontró la organización con ID: ${organizationId}`);
      process.exit(1);
    }

    console.log(`✅ Organización encontrada: ${organization.name}`);

    // 4. Asociar PayWay a la organización (si no existe ya)
    let organizationPaymentMethod = await prisma.organizationPaymentMethod.findUnique({
      where: {
        organizationId_methodId: {
          organizationId,
          methodId: paymentMethod.id,
        },
      },
    });

    if (!organizationPaymentMethod) {
      // Obtener el orden más alto actual
      const highestOrder = await prisma.organizationPaymentMethod.findFirst({
        where: { organizationId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });

      organizationPaymentMethod = await prisma.organizationPaymentMethod.create({
        data: {
          organizationId,
          methodId: paymentMethod.id,
          isEnabled: true,
          order: (highestOrder?.order || -1) + 1,
        },
      });

      console.log('✅ PayWay asociado a la organización');
    } else {
      console.log('ℹ️  PayWay ya estaba asociado a la organización');
    }

    // 5. Configurar credenciales por defecto (placeholders)
    const defaultConfigs = [
      { key: 'merchant_id', value: 'YOUR_MERCHANT_ID', description: 'ID del comercio en PayWay' },
      { key: 'api_key', value: 'YOUR_API_KEY', description: 'Clave API de PayWay', encrypted: true },
      { key: 'secret_key', value: 'YOUR_SECRET_KEY', description: 'Clave secreta de PayWay', encrypted: true },
      { key: 'environment', value: 'sandbox', description: 'Entorno: sandbox o production' },
      { key: 'success_url', value: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payments/success`, description: 'URL de éxito' },
      { key: 'cancel_url', value: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payments/cancel`, description: 'URL de cancelación' },
      { key: 'webhook_url', value: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/payway`, description: 'URL del webhook' },
    ];

    for (const config of defaultConfigs) {
      await prisma.paymentMethodConfiguration.upsert({
        where: {
          organizationPaymentMethodId_configKey: {
            organizationPaymentMethodId: organizationPaymentMethod.id,
            configKey: config.key,
          },
        },
        update: {},
        create: {
          organizationPaymentMethodId: organizationPaymentMethod.id,
          configKey: config.key,
          configValue: config.value,
          isEncrypted: config.encrypted || false,
        },
      });

      console.log(`✅ Configuración '${config.key}' creada: ${config.description}`);
    }

    console.log('');
    console.log('🎉 ¡PayWay configurado exitosamente!');
    console.log('');
    console.log('📋 Próximos pasos:');
    console.log('1. Ejecuta la migración de la base de datos:');
    console.log('   npx prisma db push');
    console.log('');
    console.log('2. Configura tus credenciales reales de PayWay:');
    console.log('   - Ve a la configuración de métodos de pago en tu aplicación');
    console.log('   - Reemplaza los valores placeholder con tus credenciales reales');
    console.log('');
    console.log('3. Credenciales a configurar:');
    defaultConfigs.forEach(config => {
      console.log(`   - ${config.key}: ${config.description}`);
    });
    console.log('');
    console.log('📚 Documentación de PayWay: https://payway.com.ar/documentacion');

  } catch (error) {
    console.error('❌ Error configurando PayWay:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupPayway(); 