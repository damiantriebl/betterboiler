import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const state = url.searchParams.get('state');

  console.log('🔄 [OAUTH CALLBACK] Callback recibido:', {
    hasCode: !!code,
    hasError: !!error,
    error,
    hasState: !!state,
    state,
    fullURL: request.url,
    searchParams: Object.fromEntries(url.searchParams.entries())
  });

  // Verificar si viene con error de MercadoPago
  if (error) {
    console.error('❌ [OAUTH CALLBACK] Error de MercadoPago:', error);
    return NextResponse.redirect(
      `${process.env.BASE_URL}/configuration?mp_error=${encodeURIComponent(error)}`
    );
  }

  // Verificar que tenemos el código
  if (!code) {
    console.error('❌ [OAUTH CALLBACK] No se recibió código OAuth');
    return NextResponse.redirect(
      `${process.env.BASE_URL}/configuration?mp_error=no_code_received`
    );
  }

  try {
    // Obtener la sesión actual
    const session = await auth.api.getSession({
      headers: request.headers
    });

    console.log('👤 [OAUTH CALLBACK] Sesión verificada:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasOrganizationId: !!session?.user?.organizationId,
      userId: session?.user?.id,
      organizationId: session?.user?.organizationId
    });

    if (!session?.user?.organizationId) {
      console.error('❌ [OAUTH CALLBACK] No hay sesión u organización válida');
      return NextResponse.redirect(
        `${process.env.BASE_URL}/configuration?mp_error=no_session_or_organization`
      );
    }

    // Intercambiar código por token con logging detallado
    const tokenResult = await exchangeCodeForToken(code);
    
    if (!tokenResult.success) {
      console.error('❌ [OAUTH CALLBACK] Falló intercambio de token:', tokenResult.error);
      return NextResponse.redirect(
        `${process.env.BASE_URL}/configuration?mp_error=token_exchange_failed&detail=${encodeURIComponent(tokenResult.error || 'unknown')}`
      );
    }

    console.log('✅ [OAUTH CALLBACK] Token obtenido exitosamente:', {
      hasAccessToken: !!tokenResult.accessToken,
      hasRefreshToken: !!tokenResult.refreshToken,
      userEmail: tokenResult.userInfo?.email
    });

    // Guardar en la base de datos
    await prisma.mercadoPagoOAuth.upsert({
      where: {
        organizationId: session.user.organizationId
      },
      update: {
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        email: tokenResult.userInfo?.email,
        mercadoPagoUserId: tokenResult.userInfo?.id?.toString(),
        expiresAt: tokenResult.expiresIn ? 
          new Date(Date.now() + tokenResult.expiresIn * 1000) : undefined,
        updatedAt: new Date()
      },
      create: {
        organizationId: session.user.organizationId,
        accessToken: tokenResult.accessToken!,
        refreshToken: tokenResult.refreshToken,
        email: tokenResult.userInfo?.email || 'unknown@example.com',
        mercadoPagoUserId: tokenResult.userInfo?.id?.toString() || 'unknown',
        expiresAt: tokenResult.expiresIn ? 
          new Date(Date.now() + tokenResult.expiresIn * 1000) : undefined
      }
    });

    console.log('✅ [OAUTH CALLBACK] Configuración OAuth guardada en BD');

    // Redirigir con éxito
    return NextResponse.redirect(
      `${process.env.BASE_URL}/configuration?mp_success=true`
    );

  } catch (error) {
    console.error('💥 [OAUTH CALLBACK] Error general:', error);
    return NextResponse.redirect(
      `${process.env.BASE_URL}/configuration?mp_error=callback_error&detail=${encodeURIComponent(error instanceof Error ? error.message : 'unknown_error')}`
    );
  }
}

async function exchangeCodeForToken(code: string) {
  try {
    console.log('🔄 [OAUTH] Intercambiando código por token...', {
      code: code.substring(0, 10) + '...',
      clientId: process.env.MERCADOPAGO_CLIENT_ID ? 'CONFIGURADO' : 'NO CONFIGURADO',
      clientSecret: process.env.MERCADOPAGO_CLIENT_SECRET ? 'CONFIGURADO' : 'NO CONFIGURADO',
      redirectUri: `${process.env.BASE_URL}/api/configuration/mercadopago/callback`
    });

    const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.MERCADOPAGO_CLIENT_ID!,
        client_secret: process.env.MERCADOPAGO_CLIENT_SECRET!,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.BASE_URL}/api/configuration/mercadopago/callback`
      })
    });

    const tokenData = await tokenResponse.json();

    console.log('🔍 [OAUTH] Respuesta de intercambio:', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      ok: tokenResponse.ok,
      headers: {
        contentType: tokenResponse.headers.get('content-type'),
        contentLength: tokenResponse.headers.get('content-length')
      },
      dataKeys: Object.keys(tokenData || {}),
      hasAccessToken: !!tokenData?.access_token,
      hasError: !!tokenData?.error
    });

    if (!tokenResponse.ok) {
      const errorDetail = tokenData?.error_description || tokenData?.message || tokenData?.error || `HTTP ${tokenResponse.status}`;
      console.error('❌ [OAUTH] Error en respuesta de MercadoPago:', {
        status: tokenResponse.status,
        data: tokenData,
        errorDetail
      });
      
      return {
        success: false,
        error: errorDetail,
        httpStatus: tokenResponse.status,
        fullResponse: tokenData
      };
    }

    if (!tokenData?.access_token) {
      console.error('❌ [OAUTH] No se recibió access_token en respuesta válida:', tokenData);
      return {
        success: false,
        error: 'No access_token in response',
        fullResponse: tokenData
      };
    }

    // Obtener información del usuario
    let userInfo = null;
    try {
      const userResponse = await fetch('https://api.mercadopago.com/users/me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });
      
      if (userResponse.ok) {
        userInfo = await userResponse.json();
        console.log('👤 [OAUTH] Info del usuario obtenida:', {
          email: userInfo?.email,
          id: userInfo?.id,
          siteId: userInfo?.site_id
        });
      } else {
        console.warn('⚠️ [OAUTH] No se pudo obtener info del usuario:', userResponse.status);
      }
    } catch (error) {
      console.warn('⚠️ [OAUTH] Error obteniendo info del usuario:', error);
    }

    return {
      success: true,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      userInfo
    };

  } catch (error) {
    console.error('💥 [OAUTH] Error en intercambio de token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      exception: error
    };
  }
} 