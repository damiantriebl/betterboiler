import { NextRequest, NextResponse } from 'next/server';
import { requireOrganizationId } from '@/actions/util';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const organizationId = await requireOrganizationId();
    if (!organizationId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar credenciales globales de la aplicación (.env)
    const hasGlobalAccessToken = !!process.env.MERCADOPAGO_ACCESS_TOKEN;
    const hasGlobalPublicKey = !!process.env.MERCADOPAGO_PUBLIC_KEY;

    // Verificar credenciales OAuth de esta organización (base de datos)
    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: {
        organizationId: organizationId
      }
    });

    const hasOAuthConfig = !!oauthConfig;
    const hasOAuthAccessToken = !!oauthConfig?.accessToken;

    // Determinar el entorno basado en las claves
    let environment = 'unknown';
    if (hasGlobalAccessToken && process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith('TEST-')) {
      environment = 'sandbox';
    } else if (hasGlobalAccessToken && process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith('APP_USR-')) {
      environment = 'production';
    }

    // Determinar modo de integración
    let integrationMode: 'oauth' | 'direct' | 'incomplete' = 'incomplete';
    
    if (hasGlobalAccessToken && hasGlobalPublicKey) {
      integrationMode = 'direct'; // Pagos directos con credenciales globales
    }
    
    if (hasOAuthConfig && hasOAuthAccessToken) {
      integrationMode = 'oauth'; // OAuth configurado para esta organización
    }

    return NextResponse.json({
      // Credenciales globales (aplicación principal)
      hasGlobalAccessToken,
      hasGlobalPublicKey,
      
      // Credenciales OAuth (específicas de organización)
      hasOAuthConfig,
      hasOAuthAccessToken,
      oauthEmail: oauthConfig?.email || null,
      oauthUserId: oauthConfig?.mercadoPagoUserId || null,
      
      // Estado general
      environment,
      integrationMode,
      isConfigured: hasGlobalAccessToken && hasGlobalPublicKey,
      canMakePayments: hasGlobalAccessToken && hasGlobalPublicKey,
      canConnectVendors: hasGlobalAccessToken && hasGlobalPublicKey, // Necesitas credenciales globales para OAuth
      organizationConnected: hasOAuthConfig && hasOAuthAccessToken
    });

  } catch (error) {
    console.error('Error verificando estado de configuración:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

async function verifyMercadoPagoToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    return response.ok;
  } catch (error) {
    console.error('Error verificando token de Mercado Pago:', error);
    return false;
  }
} 