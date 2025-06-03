import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

interface ProcessPaymentRequest {
  token?: string;
  payment_method_id: string;
  installments: number;
  issuer_id?: string;
  payer: {
    email: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  amount: number;
  description: string;
  external_reference?: string;
  metadata?: {
    motorcycle_id?: string;
    sale_id?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session?.user?.organizationId) {
      return NextResponse.json(
        { error: 'No se encontró sesión válida' },
        { status: 401 }
      );
    }

    const body: ProcessPaymentRequest = await request.json();

    console.log('💳 [PROCESS-PAYMENT] Procesando pago para organización:', {
      organizationId: session.user.organizationId,
      paymentMethodId: body.payment_method_id,
      amount: body.amount,
      installments: body.installments
    });

    // Obtener configuración OAuth de la organización
    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: {
        organizationId: session.user.organizationId
      }
    });

    if (!oauthConfig?.accessToken) {
      return NextResponse.json(
        { 
          error: 'MercadoPago no está configurado para esta organización',
          details: 'Debe conectar MercadoPago primero en configuración'
        },
        { status: 400 }
      );
    }

    // Preparar datos del pago
    const paymentData = {
      transaction_amount: body.amount,
      token: body.token,
      description: body.description,
      installments: body.installments,
      payment_method_id: body.payment_method_id,
      issuer_id: body.issuer_id,
      payer: {
        email: body.payer.email,
        identification: body.payer.identification
      },
      external_reference: body.external_reference,
      metadata: {
        ...body.metadata,
        organization_id: session.user.organizationId
      },
      notification_url: `${process.env.BASE_URL}/api/mercadopago/webhooks`,
      statement_descriptor: "BETTER-MOTOS" // Aparece en el resumen de la tarjeta
    };

    console.log('🔄 [PROCESS-PAYMENT] Enviando pago a MercadoPago:', {
      amount: paymentData.transaction_amount,
      paymentMethodId: paymentData.payment_method_id,
      hasToken: !!paymentData.token
    });

    // Enviar pago a MercadoPago
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${oauthConfig.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${session.user.organizationId}-${Date.now()}-${Math.random()}`
      },
      body: JSON.stringify(paymentData)
    });

    const paymentResult = await response.json();

    if (!response.ok) {
      console.error('❌ [PROCESS-PAYMENT] Error de MercadoPago:', {
        status: response.status,
        error: paymentResult
      });
      
      return NextResponse.json({
        success: false,
        error: 'Error al procesar el pago',
        details: paymentResult.message || 'Error de comunicación con MercadoPago',
        mercadopago_error: paymentResult
      }, { status: 400 });
    }

    console.log('✅ [PROCESS-PAYMENT] Pago procesado exitosamente:', {
      paymentId: paymentResult.id,
      status: paymentResult.status,
      statusDetail: paymentResult.status_detail
    });

    // Aquí podrías guardar el pago en tu base de datos
    // await prisma.payment.create({ ... });

    return NextResponse.json({
      success: true,
      payment: {
        id: paymentResult.id,
        status: paymentResult.status,
        status_detail: paymentResult.status_detail,
        transaction_amount: paymentResult.transaction_amount,
        payment_method_id: paymentResult.payment_method_id,
        installments: paymentResult.installments,
        external_reference: paymentResult.external_reference
      }
    });

  } catch (error) {
    console.error('❌ [PROCESS-PAYMENT] Error interno:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 