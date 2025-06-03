import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

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

    // Obtener métodos de pago disponibles usando el access token de la organización
    const response = await fetch('https://api.mercadopago.com/v1/payment_methods', {
      headers: {
        'Authorization': `Bearer ${oauthConfig.accessToken}`
      }
    });

    if (!response.ok) {
      console.error('Error obteniendo métodos de pago:', await response.text());
      return NextResponse.json(
        { error: 'Error obteniendo métodos de pago' },
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