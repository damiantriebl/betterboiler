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

    // Manejar diferentes tipos de notificaciones
    const notificationType = body.type;
    const topicId = body.data?.id;
    
    if (!topicId) {
      console.error('❌ No se encontró ID en la notificación');
      return NextResponse.json({ error: 'ID missing' }, { status: 400 });
    }

    // Verificar que las credenciales estén configuradas
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      console.error('❌ Credenciales de Mercado Pago no configuradas');
      return NextResponse.json({ error: 'MP credentials not configured' }, { status: 400 });
    }

    // Procesar según el tipo de notificación
    let processResult;
    
    switch (notificationType) {
      case 'payment':
        processResult = await handlePaymentNotification(topicId, organizationId);
        break;
        
      case 'subscription':
        processResult = await handleSubscriptionNotification(topicId, organizationId);
        break;
        
      case 'merchant_order':
        processResult = await handleMerchantOrderNotification(topicId, organizationId);
        break;
        
      case 'point_integration_wh':
        processResult = await handlePointIntegrationNotification(topicId, organizationId);
        break;
        
      case 'delivery':
        processResult = await handleDeliveryNotification(topicId, organizationId);
        break;
        
      case 'chargebacks':
        processResult = await handleChargebackNotification(topicId, organizationId);
        break;
        
      case 'invoice':
        processResult = await handleInvoiceNotification(topicId, organizationId);
        break;
        
      default:
        console.log(`ℹ️ Tipo de notificación no específicamente manejado: ${notificationType}`);
        processResult = await handleGenericNotification(notificationType, topicId, organizationId);
    }

    console.log(`✅ Procesado webhook tipo ${notificationType} para org ${organizationId}:`, processResult);
    
    return NextResponse.json({ status: 'processed', type: notificationType, result: processResult });

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

// Funciones para manejar diferentes tipos de notificaciones

async function handlePaymentNotification(paymentId: string, organizationId: string) {
  try {
    // Consultar detalles del pago desde Mercado Pago
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
      }
    });

    if (!paymentResponse.ok) {
      console.error('❌ Error al consultar pago en Mercado Pago');
      return { error: 'Payment not found' };
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

    return { paymentId, status: paymentData.status, processed: true };
  } catch (error) {
    console.error('❌ Error procesando notificación de pago:', error);
    return { error: 'Error processing payment notification' };
  }
}

async function handleSubscriptionNotification(subscriptionId: string, organizationId: string) {
  try {
    console.log(`📋 Procesando notificación de suscripción ${subscriptionId} para org ${organizationId}`);
    
    // TODO: Implementar lógica de suscripciones
    // - Consultar estado de suscripción
    // - Procesar cambios de estado
    // - Notificar cambios al cliente
    
    return { subscriptionId, type: 'subscription', processed: true };
  } catch (error) {
    console.error('❌ Error procesando suscripción:', error);
    return { error: 'Error processing subscription notification' };
  }
}

async function handleMerchantOrderNotification(orderId: string, organizationId: string) {
  try {
    console.log(`📦 Procesando orden comercial ${orderId} para org ${organizationId}`);
    
    // TODO: Implementar lógica de órdenes comerciales
    // - Consultar estado de la orden
    // - Actualizar inventario
    // - Coordinar fulfillment
    
    return { orderId, type: 'merchant_order', processed: true };
  } catch (error) {
    console.error('❌ Error procesando orden comercial:', error);
    return { error: 'Error processing merchant order notification' };
  }
}

async function handlePointIntegrationNotification(pointId: string, organizationId: string) {
  try {
    console.log(`🎯 Procesando integración Point ${pointId} para org ${organizationId}`);
    
    // TODO: Implementar lógica de Point Integration
    // - Manejar eventos de dispositivos Point
    // - Sincronizar transacciones
    
    return { pointId, type: 'point_integration', processed: true };
  } catch (error) {
    console.error('❌ Error procesando Point Integration:', error);
    return { error: 'Error processing point integration notification' };
  }
}

async function handleDeliveryNotification(deliveryId: string, organizationId: string) {
  try {
    console.log(`🚚 Procesando delivery ${deliveryId} para org ${organizationId}`);
    
    // TODO: Implementar lógica de delivery
    // - Actualizar estado de envío
    // - Notificar tracking al cliente
    
    return { deliveryId, type: 'delivery', processed: true };
  } catch (error) {
    console.error('❌ Error procesando delivery:', error);
    return { error: 'Error processing delivery notification' };
  }
}

async function handleChargebackNotification(chargebackId: string, organizationId: string) {
  try {
    console.log(`⚠️ Procesando contracargo ${chargebackId} para org ${organizationId}`);
    
    // TODO: Implementar lógica de contracargos
    // - Notificar al vendedor inmediatamente
    // - Preparar documentación de defensa
    // - Registrar disputa
    
    return { chargebackId, type: 'chargeback', processed: true };
  } catch (error) {
    console.error('❌ Error procesando contracargo:', error);
    return { error: 'Error processing chargeback notification' };
  }
}

async function handleInvoiceNotification(invoiceId: string, organizationId: string) {
  try {
    console.log(`📄 Procesando factura ${invoiceId} para org ${organizationId}`);
    
    // TODO: Implementar lógica de facturas
    // - Actualizar estado de facturación
    // - Enviar comprobantes
    
    return { invoiceId, type: 'invoice', processed: true };
  } catch (error) {
    console.error('❌ Error procesando factura:', error);
    return { error: 'Error processing invoice notification' };
  }
}

async function handleGenericNotification(notificationType: string, topicId: string, organizationId: string) {
  try {
    console.log(`🔔 Procesando notificación genérica tipo ${notificationType}, ID ${topicId} para org ${organizationId}`);
    
    // Registrar la notificación para análisis futuro
    return { 
      notificationType, 
      topicId, 
      organizationId,
      processed: true, 
      note: 'Notificación registrada pero no procesada específicamente' 
    };
  } catch (error) {
    console.error('❌ Error procesando notificación genérica:', error);
    return { error: 'Error processing generic notification' };
  }
} 