import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Obtener todas las configuraciones OAuth de MercadoPago
    const configs = await prisma.mercadoPagoOAuth.findMany({
      select: {
        id: true,
        organizationId: true,
        publicKey: true,
        accessToken: true,
        scopes: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      success: true,
      totalConfigs: configs.length,
      configs: configs.map(config => ({
        ...config,
        publicKey: config.publicKey ? `${config.publicKey.substring(0, 20)}...` : null,
        accessToken: config.accessToken ? `${config.accessToken.substring(0, 20)}...` : null,
        publicKeyType: typeof config.publicKey,
        accessTokenType: typeof config.accessToken,
        hasPublicKey: !!config.publicKey,
        hasAccessToken: !!config.accessToken,
      }))
    });

  } catch (error) {
    console.error('❌ [DEBUG] Error al obtener configuraciones:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 