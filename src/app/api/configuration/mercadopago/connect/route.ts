import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    // Obtener la sesión actual
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session?.user?.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No hay sesión u organización válida' },
        { status: 401 }
      );
    }

    // Verificar si se solicitó logout forzado
    const body = await request.json().catch(() => ({}));
    const forceLogout = body.forceLogout === true;

    const baseUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/configuration/mercadopago/callback`;

    // Construir URL de autorización de Mercado Pago
    const authUrl = new URL('https://auth.mercadopago.com.ar/authorization');
    authUrl.searchParams.set('client_id', process.env.MERCADOPAGO_CLIENT_ID!);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('platform_id', 'mp');
    authUrl.searchParams.set('state', session.user.organizationId || 'default');
    authUrl.searchParams.set('redirect_uri', redirectUri);

    // Si se solicita logout forzado, agregar parámetros adicionales
    if (forceLogout) {
      // Agregar timestamp único para evitar caché
      authUrl.searchParams.set('_t', Date.now().toString());
      // Agregar parámetro para indicar logout (algunos proveedores lo respetan)
      authUrl.searchParams.set('prompt', 'login');
      authUrl.searchParams.set('max_age', '0');
    }

    console.log('🔗 [OAUTH] URL de autorización generada:', {
      authUrl: authUrl.toString(),
      redirectUri,
      clientId: process.env.MERCADOPAGO_CLIENT_ID ? 'CONFIGURADO' : 'NO CONFIGURADO',
      organizationId: session.user.organizationId,
      forceLogout
    });

    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString(),
      redirectUri,
      organizationId: session.user.organizationId,
      forceLogout
    });

  } catch (error) {
    console.error('❌ [OAUTH] Error generando URL de conexión:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Detectar URL base (localhost.run o configuración local)
    let baseUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
    
    if (!baseUrl) {
      const requestHost = request.headers.get('host');
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      
      if (requestHost?.includes('localhost.run')) {
        baseUrl = `https://${requestHost}`;
      } else {
        baseUrl = `${protocol}://${requestHost}`;
      }
    }

    const redirectUri = `${baseUrl}/api/configuration/mercadopago/callback`;

    // Verificar que CLIENT_ID esté configurado
    if (!process.env.MERCADOPAGO_CLIENT_ID) {
      return NextResponse.json({
        success: false,
        error: 'MERCADOPAGO_CLIENT_ID no está configurado',
        details: 'Configura CLIENT_ID en las variables de entorno o usa localhost.run para HTTPS',
        suggestions: [
          'Configura MERCADOPAGO_CLIENT_ID en .env.local',
          'Usar localhost.run: ssh -R 80:localhost:3000 ssh.localhost.run',
        ]
      }, { status: 400 });
    }

    // Construir URL de autorización de MercadoPago
    const authUrl = new URL('https://auth.mercadopago.com.ar/authorization');
    authUrl.searchParams.set('client_id', process.env.MERCADOPAGO_CLIENT_ID);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('platform_id', 'mp'); 
    authUrl.searchParams.set('state', session.user.organizationId || 'default');
    authUrl.searchParams.set('redirect_uri', redirectUri);

    console.log('🔗 [OAUTH] URL de autorización generada:', {
      authUrl: authUrl.toString(),
      redirectUri,
      clientId: process.env.MERCADOPAGO_CLIENT_ID ? 'CONFIGURADO' : 'NO CONFIGURADO',
      organizationId: session.user.organizationId
    });

    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString(),
      redirectUri,
      organizationId: session.user.organizationId
    });

  } catch (error) {
    console.error('❌ [OAUTH] Error generando URL de conexión:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 