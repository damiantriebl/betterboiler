import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, formData, amount, description, payer } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID requerido' },
        { status: 400 }
      );
    }

    // Obtener la configuración OAuth de esta organización
    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: {
        organizationId: organizationId
      }
    });

    if (!oauthConfig) {
      return NextResponse.json(
        { error: 'Mercado Pago no está conectado para esta organización' },
        { status: 400 }
      );
    }

    // Preparar el payload para crear el pago
    const paymentData = {
      transaction_amount: Number(amount),
      description: description,
      payment_method_id: formData.payment_method_id,
      payer: {
        email: payer.email,
        first_name: payer.firstName,
        last_name: payer.lastName,
        identification: payer.identification
      },
      token: formData.token, // Token generado por el brick
      installments: formData.installments || 1,
      issuer_id: formData.issuer_id,
      external_reference: `org-${organizationId}-${Date.now()}`,
      statement_descriptor: description.substring(0, 22) // Máximo 22 caracteres
    };

    console.log('Procesando pago con datos:', JSON.stringify(paymentData, null, 2));

    // Crear el pago usando el access token de la organización
    const paymentResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${oauthConfig.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `payment-${organizationId}-${Date.now()}` // Para evitar pagos duplicados
      },
      body: JSON.stringify(paymentData)
    });

    const paymentResult = await paymentResponse.json();

    if (!paymentResponse.ok) {
      console.error('Error de Mercado Pago:', paymentResult);
      return NextResponse.json(
        { 
          error: 'Error procesando el pago',
          details: paymentResult
        },
        { status: paymentResponse.status }
      );
    }

    // El pago se procesó exitosamente
    console.log('Pago procesado exitosamente:', paymentResult.id);

    return NextResponse.json({
      success: true,
      payment_id: paymentResult.id,
      status: paymentResult.status,
      status_detail: paymentResult.status_detail,
      amount: paymentResult.transaction_amount,
      currency: paymentResult.currency_id,
      payment_method: paymentResult.payment_method_id,
      installments: paymentResult.installments,
      external_reference: paymentResult.external_reference
    });

  } catch (error) {
    console.error('Error procesando pago:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 