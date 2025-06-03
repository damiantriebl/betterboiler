import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface WebhookParams {
  params: Promise<{
    organizationId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: WebhookParams) {
  try {
    const { organizationId } = await params;
    const body = await request.json();
    
    console.log(`🔔 Webhook de Mercado Pago recibido para organización ${organizationId}:`, body);

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

    // Verificar que las credenciales estén configuradas
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      console.error('❌ Credenciales de Mercado Pago no configuradas');
      return NextResponse.json({ error: 'MP credentials not configured' }, { status: 400 });
    }

    // Consultar detalles del pago desde Mercado Pago
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
      }
    });

    if (!paymentResponse.ok) {
      console.error('❌ Error al consultar pago en Mercado Pago');
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const paymentData = await paymentResponse.json();
    console.log(`💳 Datos del pago obtenidos para org ${organizationId}:`, {
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
    console.log(`✅ Procesando pago aprobado para org ${organizationId}:`, {
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
    console.log(`⏳ Procesando pago pendiente para org ${organizationId}:`, {
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
    console.log(`❌ Procesando pago rechazado para org ${organizationId}:`, {
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
export async function GET(request: NextRequest, { params }: WebhookParams) {
  const { organizationId } = await params;
  
  return NextResponse.json({
    status: 'active',
    service: 'Mercado Pago Webhook',
    organizationId,
    timestamp: new Date().toISOString()
  });
} 