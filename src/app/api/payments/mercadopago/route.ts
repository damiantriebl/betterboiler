import { NextRequest, NextResponse } from 'next/server';
import { requireOrganizationId } from '@/actions/util';

export async function POST(request: NextRequest) {
  try {
    // Obtener organizationId de la sesión
    const organizationId = await requireOrganizationId();
    if (!organizationId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar que las credenciales estén configuradas en el .env
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN || !process.env.MERCADOPAGO_PUBLIC_KEY) {
      return NextResponse.json(
        { error: 'Mercado Pago no configurado en el servidor' },
        { status: 400 }
      );
    }

    // Parsear el cuerpo de la solicitud
    const body = await request.json();
    const {
      transaction_amount,
      currency_id = 'ARS',
      description,
      payer,
      external_reference
    } = body;

    // Validar datos requeridos
    if (!transaction_amount || !description || !payer?.email) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: transaction_amount, description, payer.email' },
        { status: 400 }
      );
    }

    // Preparar el payload para crear una preference (Checkout Pro)
    const baseUrl = (process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001').replace(/\/$/, '');
    
    console.log('DEBUG - Variables de entorno:');
    console.log('BASE_URL:', process.env.BASE_URL);
    console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
    console.log('baseUrl final:', baseUrl);
    
    const preferenceData = {
      items: [
        {
          title: description,
          quantity: 1,
          unit_price: Number(transaction_amount),
          currency_id
        }
      ],
      payer: {
        email: payer.email,
        name: payer.first_name || '',
        surname: payer.last_name || '',
        identification: payer.identification || undefined
      },
      external_reference: external_reference || `org-${organizationId}-${Date.now()}`,
      back_urls: {
        success: `${baseUrl}/payments/success`,
        failure: `${baseUrl}/payments/failure`,
        pending: `${baseUrl}/payments/pending`
      }
    };

    console.log('Enviando preference a Mercado Pago:', JSON.stringify(preferenceData, null, 2));

    // Llamar a la API de Mercado Pago para crear la preference
    const mercadoPagoResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferenceData)
    });

    const responseData = await mercadoPagoResponse.json();

    if (!mercadoPagoResponse.ok) {
      console.error('Error de Mercado Pago:', responseData);
      return NextResponse.json(
        { 
          error: 'Error al crear la preferencia de pago',
          details: responseData
        },
        { status: mercadoPagoResponse.status }
      );
    }

    // Retornar la respuesta con la URL de checkout
    return NextResponse.json({
      success: true,
      preference_id: responseData.id,
      init_point: responseData.init_point, // URL para redirigir al usuario
      sandbox_init_point: responseData.sandbox_init_point
    });

  } catch (error) {
    console.error('Error en endpoint de Mercado Pago:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Endpoint para obtener métodos de pago disponibles
export async function GET(request: NextRequest) {
  try {
    const organizationId = await requireOrganizationId();
    if (!organizationId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'Mercado Pago no configurado' },
        { status: 400 }
      );
    }

    // Obtener métodos de pago disponibles desde Mercado Pago
    const response = await fetch('https://api.mercadopago.com/v1/payment_methods', {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Error al obtener métodos de pago' },
        { status: response.status }
      );
    }

    const paymentMethods = await response.json();
    
    return NextResponse.json({
      success: true,
      payment_methods: paymentMethods
    });

  } catch (error) {
    console.error('Error obteniendo métodos de pago:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 