import { NextRequest, NextResponse } from 'next/server';
import { requireOrganizationId } from '@/actions/util';

export async function POST(request: NextRequest) {
  try {
    const organizationId = await requireOrganizationId();
    if (!organizationId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token de Mercado Pago no configurado' },
        { status: 400 }
      );
    }

    if (!accessToken.startsWith('TEST-')) {
      return NextResponse.json(
        { error: 'Este endpoint solo funciona con credenciales de sandbox (TEST-)' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    const paymentData = {
      transaction_amount: body.transaction_amount || 100,
      description: body.description || 'Test de Mercado Pago Sandbox',
      payment_method_id: 'visa',
      payer: {
        email: body.payer?.email || 'test@testuser.com'
      },
      // Para testing en sandbox - usar approach simplificado
      token: 'ff8080814c11e237014c1ff593b57b4d', // Token de testing válido para sandbox
      installments: 1,
      metadata: {
        organization_id: organizationId,
        test: true
      }
    };

    console.log('🧪 Creando pago de prueba en sandbox:', paymentData);

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `test-${organizationId}-${Date.now()}`
      },
      body: JSON.stringify(paymentData)
    });

    const responseData = await response.json();

    if (response.ok) {
      console.log('✅ Pago de prueba creado:', responseData.id);
      
      return NextResponse.json({
        success: true,
        payment: {
          id: responseData.id,
          status: responseData.status,
          status_detail: responseData.status_detail,
          amount: responseData.transaction_amount,
          currency: responseData.currency_id,
          description: responseData.description,
          payer_email: responseData.payer?.email,
          created_at: responseData.date_created,
          external_reference: responseData.external_reference
        },
        message: 'Pago de prueba creado exitosamente en sandbox',
        test_data: {
          environment: 'sandbox',
          token_used: 'ff8080814c11e237014c1ff593b57b4d',
          organization_id: organizationId
        }
      });
    } else {
      console.error('❌ Error en API de Mercado Pago:', responseData);
      
      return NextResponse.json({
        error: 'Error al crear pago de prueba',
        details: responseData.message || 'Error desconocido',
        mercadopago_error: responseData
      }, { status: response.status });
    }

  } catch (error) {
    console.error('💥 Error en test de pago:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
} 