import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    // Solo en desarrollo o con clave específica
    const debugKey = request.nextUrl.searchParams.get('key');
    if (process.env.NODE_ENV === 'production' && debugKey !== process.env.DEBUG_KEY) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Información del entorno
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'CONFIGURADO' : 'NO CONFIGURADO',
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ? 'CONFIGURADO' : 'NO CONFIGURADO',
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'NO CONFIGURADO',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NO CONFIGURADO',
      BASE_URL: process.env.BASE_URL || 'NO CONFIGURADO',
    };

    // Información de la URL actual
    const urlInfo = {
      origin: request.nextUrl.origin,
      pathname: request.nextUrl.pathname,
      headers: {
        host: request.headers.get('host'),
        'x-forwarded-host': request.headers.get('x-forwarded-host'),
        'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
        'user-agent': request.headers.get('user-agent'),
      }
    };

    // Información de cookies
    const cookieInfo = {
      rawCookies: request.headers.get('cookie') || 'NO HAY COOKIES',
      authCookies: request.headers.get('cookie')?.split(';')
        .filter(cookie => cookie.includes('auth') || cookie.includes('session') || cookie.includes('better'))
        .map(cookie => cookie.trim()) || []
    };

    // Intentar obtener sesión
    let sessionInfo;
    try {
      const session = await auth.api.getSession({
        headers: request.headers
      });
      sessionInfo = {
        hasSession: !!session,
        userId: session?.user?.id || null,
        userEmail: session?.user?.email || null,
        organizationId: session?.user?.organizationId || null,
      };
    } catch (error) {
      sessionInfo = {
        hasSession: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      envInfo,
      urlInfo,
      cookieInfo,
      sessionInfo,
    });

  } catch (error) {
    console.error('Error en debug de producción:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 