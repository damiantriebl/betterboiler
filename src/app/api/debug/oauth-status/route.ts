import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Verificar clave de debug
    const url = new URL(request.url);
    const debugKey = url.searchParams.get('key');
    
    if (debugKey !== process.env.DEBUG_KEY && debugKey !== 'DEBUG_KEY') {
      return NextResponse.json(
        { error: 'Acceso denegado - clave de debug incorrecta' },
        { status: 403 }
      );
    }

    // Obtener sesión
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session?.user?.organizationId) {
      return NextResponse.json(
        { error: 'No hay sesión u organización' },
        { status: 401 }
      );
    }

    const organizationId = session.user.organizationId;

    // Buscar configuración OAuth en la base de datos
    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: {
        organizationId: organizationId
      }
    });

    // Información de estado
    const status = {
      timestamp: new Date().toISOString(),
      organizationId,
      hasOAuthConfig: !!oauthConfig,
      oauthDetails: oauthConfig ? {
        mercadoPagoUserId: oauthConfig.mercadoPagoUserId,
        email: oauthConfig.email,
        hasAccessToken: !!oauthConfig.accessToken,
        accessTokenPrefix: oauthConfig.accessToken?.substring(0, 10) + '...',
        hasRefreshToken: !!oauthConfig.refreshToken,
        hasPublicKey: !!oauthConfig.publicKey,
        scopes: oauthConfig.scopes,
        expiresAt: oauthConfig.expiresAt,
        createdAt: oauthConfig.createdAt,
        updatedAt: oauthConfig.updatedAt
      } : null,
      recommendations: oauthConfig ? [
        '✅ OAuth configurado correctamente',
        'La organización está conectada a MercadoPago',
        'Puede procesar pagos via marketplace'
      ] : [
        '⚠️ OAuth no configurado',
        'Ejecutar proceso de conexión con MercadoPago',
        'Verificar que el callback se ejecutó correctamente'
      ]
    };

    return NextResponse.json(status);

  } catch (error) {
    return NextResponse.json({
      error: 'Error verificando estado OAuth',
      details: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 