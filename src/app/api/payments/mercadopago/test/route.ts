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
    const publicKey = process.env.MERCADOPAGO_PUBLIC_KEY;
    
    if (!accessToken || !publicKey) {
      return NextResponse.json(
        { error: 'Credenciales de Mercado Pago no configuradas' },
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

    console.log('🧪 Creando token de tarjeta para testing...');

    // Paso 1: Crear token de tarjeta para testing
    const cardTokenData = {
      card_number: '4509953566233704',
      security_code: '123',
      expiration_month: 11,
      expiration_year: 2030,
      cardholder: {
        name: 'APRO'
      }
    };

    const tokenResponse = await fetch('https://api.mercadopago.com/v1/card_tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cardTokenData)
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('❌ Error creando token de tarjeta:', tokenData);
      return NextResponse.json({
        error: 'Error creando token de tarjeta',
        details: tokenData.message || 'Error desconocido',
        mercadopago_error: tokenData
      }, { status: tokenResponse.status });
    }

    console.log('✅ Token de tarjeta creado:', tokenData.id);

    // Paso 2: Crear pago usando el token
    const paymentData = {
      transaction_amount: body.transaction_amount || 100,
      description: body.description || 'Test de Mercado Pago Sandbox',
      payment_method_id: 'visa',
      payer: {
        email: body.payer?.email || 'test@testuser.com'
      },
      token: tokenData.id,
      installments: 1,
      metadata: {
        organization_id: organizationId,
        test: true
      }
    };

    console.log('🧪 Creando pago de prueba en sandbox con token:', tokenData.id);

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
          token_used: tokenData.id,
          organization_id: organizationId,
          card_token_created: true
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