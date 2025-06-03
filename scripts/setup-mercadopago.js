#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupMercadoPago() {
  console.log('🚀 Configurando Mercado Pago Checkout API...');

  try {
    // 1. Crear o actualizar el método de pago Mercado Pago
    const paymentMethod = await prisma.paymentMethod.upsert({
      where: { type: 'mercadopago' },
      update: {},
      create: {
        name: 'Mercado Pago',
        type: 'mercadopago',
        description: 'Checkout API de Mercado Pago - Control total sin redirección',
        iconUrl: 'https://http2.mlstatic.com/frontend-assets/mp-web-navigation/ui-navigation/5.21.22/mercadopago/logo__large@2x.png',
      },
    });

    console.log('✅ Método de pago Mercado Pago creado/actualizado:', paymentMethod);

    // 2. Solicitar la organización a configurar
    const organizationId = process.argv[2];
    if (!organizationId) {
      console.log('❌ Error: Debes proporcionar el ID de la organización');
      console.log('Uso: node scripts/setup-mercadopago.js [ORGANIZATION_ID]');
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

    // 4. Asociar Mercado Pago a la organización (si no existe ya)
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

      console.log('✅ Mercado Pago asociado a la organización');
    } else {
      console.log('ℹ️  Mercado Pago ya estaba asociado a la organización');
    }

    // 5. Configurar credenciales por defecto (placeholders)
    const defaultConfigs = [
      { key: 'access_token', value: 'YOUR_ACCESS_TOKEN', description: 'Access Token de Mercado Pago', encrypted: true },
      { key: 'public_key', value: 'YOUR_PUBLIC_KEY', description: 'Public Key de Mercado Pago' },
      { key: 'environment', value: 'sandbox', description: 'Entorno: sandbox o production' },
      { key: 'success_url', value: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payments/success`, description: 'URL de éxito' },
      { key: 'failure_url', value: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payments/failure`, description: 'URL de error' },
      { key: 'pending_url', value: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payments/pending`, description: 'URL pendiente' },
      { key: 'webhook_url', value: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/mercadopago`, description: 'URL del webhook' },
      { key: 'notification_url', value: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/mercadopago`, description: 'URL de notificaciones' },
      { key: 'integrator_id', value: '', description: 'Integrator ID (opcional)' },
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
    console.log('🎉 ¡Mercado Pago configurado exitosamente!');
    console.log('');
    console.log('📋 Próximos pasos:');
    console.log('1. Obtén tus credenciales de Mercado Pago:');
    console.log('   https://www.mercadopago.com.ar/developers/panel/credentials');
    console.log('');
    console.log('2. Instala el SDK de Mercado Pago:');
    console.log('   pnpm add mercadopago');
    console.log('');
    console.log('3. Configura tus credenciales reales:');
    console.log('   - Ve a la configuración de métodos de pago en tu aplicación');
    console.log('   - Reemplaza los valores placeholder con tus credenciales reales');
    console.log('');
    console.log('4. Credenciales a configurar:');
    defaultConfigs.forEach(config => {
      console.log(`   - ${config.key}: ${config.description}`);
    });
    console.log('');
    console.log('📚 Documentación: https://www.mercadopago.com.ar/developers/es/docs/checkout-api-v2');
    console.log('🔐 Credenciales: https://www.mercadopago.com.ar/developers/panel/credentials');

  } catch (error) {
    console.error('❌ Error configurando Mercado Pago:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupMercadoPago(); 