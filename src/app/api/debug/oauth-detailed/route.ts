import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Verificar clave de debug
    const url = new URL(request.url);
    const debugKey = url.searchParams.get('key');
    const organizationId = url.searchParams.get('org');
    
    if (debugKey !== process.env.DEBUG_KEY && debugKey !== 'DEBUG_KEY') {
      return NextResponse.json(
        { error: 'Acceso denegado - clave de debug incorrecta' },
        { status: 403 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID requerido (parámetro org)' },
        { status: 400 }
      );
    }

    // Buscar configuración OAuth en la base de datos
    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: {
        organizationId: organizationId
      }
    });

    // Verificar si el token sigue siendo válido (si existe)
    let tokenValidation = null;
    if (oauthConfig?.accessToken) {
      try {
        const tokenResponse = await fetch('https://api.mercadopago.com/users/me', {
          headers: {
            'Authorization': `Bearer ${oauthConfig.accessToken}`
          }
        });
        
        tokenValidation = {
          isValid: tokenResponse.ok,
          status: tokenResponse.status,
          lastChecked: new Date().toISOString()
        };
      } catch (error) {
        tokenValidation = {
          isValid: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          lastChecked: new Date().toISOString()
        };
      }
    }

    // Información detallada de estado
    const detailedStatus = {
      timestamp: new Date().toISOString(),
      organizationId,
      
      // Estado de la configuración OAuth
      oauth: {
        exists: !!oauthConfig,
        mercadoPagoUserId: oauthConfig?.mercadoPagoUserId || null,
        email: oauthConfig?.email || null,
        hasAccessToken: !!oauthConfig?.accessToken,
        hasRefreshToken: !!oauthConfig?.refreshToken,
        hasPublicKey: !!oauthConfig?.publicKey,
        scopes: oauthConfig?.scopes || [],
        createdAt: oauthConfig?.createdAt || null,
        updatedAt: oauthConfig?.updatedAt || null,
        expiresAt: oauthConfig?.expiresAt || null,
        tokenValidation
      },

      // Estado de configuración global
      globalConfig: {
        hasAccessToken: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
        hasPublicKey: !!process.env.MERCADOPAGO_PUBLIC_KEY,
        hasClientId: !!process.env.MERCADOPAGO_CLIENT_ID,
        hasClientSecret: !!process.env.MERCADOPAGO_CLIENT_SECRET,
        baseUrl: process.env.BASE_URL || 'NO CONFIGURADO',
        environment: process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith('TEST-') ? 'sandbox' : 'production'
      },

      // URLs importantes
      urls: {
        callbackUrl: `${process.env.BASE_URL || 'http://localhost:3001'}/api/configuration/mercadopago/callback`,
        webhookUrl: `${process.env.BASE_URL || 'http://localhost:3001'}/api/webhooks/mercadopago/${organizationId}`,
        configurationPage: `${process.env.BASE_URL || 'http://localhost:3001'}/configuration`
      },

      // Diagnóstico
      diagnosis: {
        canProcessDirectPayments: !!(process.env.MERCADOPAGO_ACCESS_TOKEN && process.env.MERCADOPAGO_PUBLIC_KEY),
        canUseOAuth: !!(process.env.MERCADOPAGO_CLIENT_ID && process.env.MERCADOPAGO_CLIENT_SECRET),
        organizationConnected: !!(oauthConfig && oauthConfig.accessToken),
        tokenStatus: tokenValidation?.isValid ? 'VALID' : tokenValidation ? 'INVALID' : 'NOT_CHECKED',
        integrationMode: getIntegrationMode()
      },

      // Recomendaciones
      recommendations: generateRecommendations(oauthConfig, tokenValidation)
    };

    return NextResponse.json(detailedStatus);

  } catch (error) {
    return NextResponse.json({
      error: 'Error verificando estado OAuth detallado',
      details: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function getIntegrationMode(): string {
  const hasGlobalCreds = !!(process.env.MERCADOPAGO_ACCESS_TOKEN && process.env.MERCADOPAGO_PUBLIC_KEY);
  const hasOAuthCreds = !!(process.env.MERCADOPAGO_CLIENT_ID && process.env.MERCADOPAGO_CLIENT_SECRET);
  
  if (hasGlobalCreds && hasOAuthCreds) return 'FULL_MARKETPLACE';
  if (hasGlobalCreds) return 'DIRECT_PAYMENTS_ONLY';
  if (hasOAuthCreds) return 'OAUTH_ONLY';
  return 'INCOMPLETE';
}

function generateRecommendations(oauthConfig: any, tokenValidation: any): string[] {
  const recommendations = [];

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN || !process.env.MERCADOPAGO_PUBLIC_KEY) {
    recommendations.push('⚠️ Configurar credenciales globales (ACCESS_TOKEN + PUBLIC_KEY)');
  }

  if (!process.env.MERCADOPAGO_CLIENT_ID || !process.env.MERCADOPAGO_CLIENT_SECRET) {
    recommendations.push('⚠️ Configurar credenciales OAuth (CLIENT_ID + CLIENT_SECRET)');
  }

  if (!oauthConfig) {
    recommendations.push('🔗 Ejecutar proceso de conexión OAuth para esta organización');
  } else if (tokenValidation && !tokenValidation.isValid) {
    recommendations.push('🔄 Token OAuth expirado o inválido - reconectar organización');
  } else if (oauthConfig && tokenValidation?.isValid) {
    recommendations.push('✅ OAuth configurado correctamente - organización puede procesar pagos');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Configuración completa y funcional');
  }

  return recommendations;
} 