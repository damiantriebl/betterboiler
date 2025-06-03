import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Verificar si hubo un error en la autorización
    if (error) {
      console.error('Error en autorización OAuth:', error);
      return NextResponse.redirect(
        `${process.env.BASE_URL || 'http://localhost:3001'}/configuration?mp_error=${encodeURIComponent(error)}`
      );
    }

    // Verificar que tenemos el código de autorización
    if (!code || !state) {
      console.error('Faltan parámetros requeridos:', { code: !!code, state: !!state });
      return NextResponse.redirect(
        `${process.env.BASE_URL || 'http://localhost:3001'}/configuration?mp_error=missing_params`
      );
    }

    // Extraer organizationId del state
    const [organizationId] = state.split('-');
    if (!organizationId) {
      console.error('State inválido:', state);
      return NextResponse.redirect(
        `${process.env.BASE_URL || 'http://localhost:3001'}/configuration?mp_error=invalid_state`
      );
    }

    // Intercambiar código por access token
    const tokenResponse = await exchangeCodeForToken(code);
    if (!tokenResponse.success) {
      console.error('Error intercambiando código por token:', tokenResponse.error);
      return NextResponse.redirect(
        `${process.env.BASE_URL || 'http://localhost:3001'}/configuration?mp_error=token_exchange_failed`
      );
    }

    // Obtener información del usuario de Mercado Pago
    const userInfo = await getMercadoPagoUserInfo(tokenResponse.data.access_token);
    if (!userInfo.success) {
      console.error('Error obteniendo información del usuario:', userInfo.error);
      return NextResponse.redirect(
        `${process.env.BASE_URL || 'http://localhost:3001'}/configuration?mp_error=user_info_failed`
      );
    }

    // Guardar o actualizar la configuración OAuth en la base de datos
    await prisma.mercadoPagoOAuth.upsert({
      where: {
        organizationId: organizationId
      },
      update: {
        mercadoPagoUserId: userInfo.data.id.toString(),
        accessToken: tokenResponse.data.access_token,
        refreshToken: tokenResponse.data.refresh_token || null,
        email: userInfo.data.email,
        publicKey: tokenResponse.data.public_key || null,
        scopes: tokenResponse.data.scope ? tokenResponse.data.scope.split(' ') : [],
        expiresAt: tokenResponse.data.expires_in 
          ? new Date(Date.now() + tokenResponse.data.expires_in * 1000) 
          : null,
        updatedAt: new Date()
      },
      create: {
        organizationId: organizationId,
        mercadoPagoUserId: userInfo.data.id.toString(),
        accessToken: tokenResponse.data.access_token,
        refreshToken: tokenResponse.data.refresh_token || null,
        email: userInfo.data.email,
        publicKey: tokenResponse.data.public_key || null,
        scopes: tokenResponse.data.scope ? tokenResponse.data.scope.split(' ') : [],
        expiresAt: tokenResponse.data.expires_in 
          ? new Date(Date.now() + tokenResponse.data.expires_in * 1000) 
          : null
      }
    });

    console.log('✅ OAuth de Mercado Pago configurado exitosamente para organización:', organizationId);

    // Redirigir de vuelta a la página de configuración con éxito
    return NextResponse.redirect(
      `${process.env.BASE_URL || 'http://localhost:3001'}/configuration?mp_success=true`
    );

  } catch (error) {
    console.error('Error en callback OAuth:', error);
    return NextResponse.redirect(
      `${process.env.BASE_URL || 'http://localhost:3001'}/configuration?mp_error=internal_error`
    );
  }
}

async function exchangeCodeForToken(code: string) {
  try {
    const clientId = process.env.MERCADOPAGO_CLIENT_ID;
    const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;
    const baseUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/configuration/mercadopago/callback`;

    const response = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Error intercambiando código por token'
      };
    }

    return {
      success: true,
      data
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

async function getMercadoPagoUserInfo(accessToken: string) {
  try {
    const response = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Error obteniendo información del usuario'
      };
    }

    return {
      success: true,
      data
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
} 