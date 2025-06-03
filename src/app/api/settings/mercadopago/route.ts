import { NextRequest, NextResponse } from 'next/server';
import { requireOrganizationId } from '@/actions/util';
import { 
  getMercadoPagoConfiguration, 
  updateMercadoPagoConfiguration, 
  validateMercadoPagoConfiguration 
} from '@/actions/payment-methods/mercadopago-config';

// GET - Obtener configuración actual
export async function GET() {
  try {
    const organizationId = await requireOrganizationId();

    // Verificar que las credenciales estén configuradas en el .env
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN || !process.env.MERCADOPAGO_PUBLIC_KEY) {
      return NextResponse.json({
        success: false,
        config: {},
        isValid: false,
        error: 'Mercado Pago no configurado en el servidor'
      });
    }

    // Devolver configuración desde variables de entorno
    const config = {
      public_key: process.env.MERCADOPAGO_PUBLIC_KEY,
      access_token: process.env.MERCADOPAGO_ACCESS_TOKEN,
      environment: process.env.MERCADOPAGO_ENVIRONMENT || 'sandbox'
    };

    return NextResponse.json({
      success: true,
      config,
      isValid: true
    });

  } catch (error) {
    console.error('Error obteniendo configuración de MP:', error);
    return NextResponse.json(
      { error: 'Error al obtener la configuración' },
      { status: 500 }
    );
  }
}

// POST - Guardar configuración
export async function POST(request: NextRequest) {
  try {
    const organizationId = await requireOrganizationId();
    const configData = await request.json();

    // Configurar URLs automáticas si no están definidas
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const finalConfig = {
      ...configData,
      webhook_url: configData.webhook_url || `${baseUrl}/api/webhooks/mercadopago`,
      notification_url: configData.notification_url || `${baseUrl}/api/notifications/mercadopago`,
      success_url: configData.success_url || `${baseUrl}/payments/success`,
      failure_url: configData.failure_url || `${baseUrl}/payments/failure`,
      pending_url: configData.pending_url || `${baseUrl}/payments/pending`
    };

    const success = await updateMercadoPagoConfiguration(organizationId, finalConfig);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Configuración guardada exitosamente'
      });
    } else {
      return NextResponse.json(
        { error: 'Error al guardar la configuración' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error guardando configuración de MP:', error);
    return NextResponse.json(
      { error: 'Error al guardar la configuración' },
      { status: 500 }
    );
  }
} 