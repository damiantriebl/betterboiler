import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  try {
    const { organizationId } = await params;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID requerido' },
        { status: 400 }
      );
    }

    // Buscar la configuración OAuth de esta organización
    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: {
        organizationId: organizationId
      }
    });

    if (!oauthConfig) {
      return NextResponse.json({
        isConnected: false,
        publicKey: null,
        error: 'Mercado Pago no está conectado para esta organización'
      });
    }

    // Verificar que el token sigue siendo válido
    const isTokenValid = await verifyToken(oauthConfig.accessToken);

    if (!isTokenValid) {
      return NextResponse.json({
        isConnected: false,
        publicKey: null,
        error: 'Token de Mercado Pago expirado'
      });
    }

    return NextResponse.json({
      isConnected: true,
      publicKey: oauthConfig.publicKey,
      email: oauthConfig.email,
      mercadoPagoUserId: oauthConfig.mercadoPagoUserId
    });

  } catch (error) {
    console.error('Error obteniendo configuración OAuth:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

async function verifyToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    return response.ok;
  } catch (error) {
    console.error('Error verificando token:', error);
    return false;
  }
} 