import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMercadoPagoConfiguration } from '@/actions/payment-methods/mercadopago-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔔 Webhook de Mercado Pago recibido:', body);

    // Validar que es una notificación de pago
    if (body.type !== 'payment') {
      console.log('ℹ️ Notificación ignorada - no es de tipo payment');
      return NextResponse.json({ status: 'ignored' });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      console.error('❌ No se encontró ID de pago en la notificación');
      return NextResponse.json({ error: 'Payment ID missing' }, { status: 400 });
    }

    // Obtener organizationId desde external_reference si está disponible
    let organizationId: string | null = null;
    if (body.data?.external_reference) {
      const match = body.data.external_reference.match(/org-([^-]+)/);
      if (match) {
        organizationId = match[1];
      }
    }

    if (!organizationId) {
      console.error('❌ No se pudo extraer organizationId del external_reference');
      return NextResponse.json({ error: 'Organization ID not found' }, { status: 400 });
    }

    // Obtener configuración de Mercado Pago para validar
    const config = await getMercadoPagoConfiguration(organizationId);
    if (!config) {
      console.error('❌ Configuración de Mercado Pago no encontrada para organización:', organizationId);
      return NextResponse.json({ error: 'MP config not found' }, { status: 400 });
    }

    // Consultar detalles del pago desde Mercado Pago
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${config.access_token}`
      }
    });

    if (!paymentResponse.ok) {
      console.error('❌ Error al consultar pago en Mercado Pago');
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const paymentData = await paymentResponse.json();
    console.log('💳 Datos del pago obtenidos:', {
      id: paymentData.id,
      status: paymentData.status,
      amount: paymentData.transaction_amount,
      external_reference: paymentData.external_reference
    });

    // Procesar según el estado del pago
    switch (paymentData.status) {
      case 'approved':
        console.log('✅ Pago aprobado:', paymentId);
        await handleApprovedPayment(paymentData, organizationId);
        break;
      
      case 'pending':
        console.log('⏳ Pago pendiente:', paymentId);
        await handlePendingPayment(paymentData, organizationId);
        break;
      
      case 'rejected':
      case 'cancelled':
        console.log('❌ Pago rechazado/cancelado:', paymentId);
        await handleRejectedPayment(paymentData, organizationId);
        break;
      
      default:
        console.log('ℹ️ Estado de pago no manejado:', paymentData.status);
    }

    return NextResponse.json({ status: 'processed' });

  } catch (error) {
    console.error('❌ Error procesando webhook de Mercado Pago:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleApprovedPayment(paymentData: any, organizationId: string) {
  try {
    // Aquí puedes implementar la lógica específica para pagos aprobados
    // Por ejemplo: actualizar el estado de una venta, enviar confirmación, etc.
    
    console.log('✅ Procesando pago aprobado:', {
      paymentId: paymentData.id,
      amount: paymentData.transaction_amount,
      payerEmail: paymentData.payer?.email,
      organizationId
    });

    // TODO: Implementar lógica específica del negocio
    // - Actualizar estado de venta
    // - Registrar el pago en la base de datos
    // - Enviar notificación al cliente
    // - Generar factura/recibo

  } catch (error) {
    console.error('❌ Error procesando pago aprobado:', error);
  }
}

async function handlePendingPayment(paymentData: any, organizationId: string) {
  try {
    console.log('⏳ Procesando pago pendiente:', {
      paymentId: paymentData.id,
      status: paymentData.status,
      statusDetail: paymentData.status_detail
    });

    // TODO: Implementar lógica para pagos pendientes
    // - Notificar al vendedor
    // - Marcar venta como pendiente de pago

  } catch (error) {
    console.error('❌ Error procesando pago pendiente:', error);
  }
}

async function handleRejectedPayment(paymentData: any, organizationId: string) {
  try {
    console.log('❌ Procesando pago rechazado:', {
      paymentId: paymentData.id,
      status: paymentData.status,
      statusDetail: paymentData.status_detail
    });

    // TODO: Implementar lógica para pagos rechazados
    // - Notificar al vendedor
    // - Liberar inventario si estaba reservado
    // - Permitir reintentar el pago

  } catch (error) {
    console.error('❌ Error procesando pago rechazado:', error);
  }
}

// Endpoint GET para verificar el estado del webhook
export async function GET() {
  return NextResponse.json({
    status: 'active',
    service: 'Mercado Pago Webhook',
    timestamp: new Date().toISOString()
  });
} 