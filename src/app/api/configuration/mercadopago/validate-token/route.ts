import { NextResponse } from 'next/server';
import { requireOrganizationId } from '@/actions/util';

export async function POST() {
  try {
    const organizationId = await requireOrganizationId();
    if (!organizationId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token de Mercado Pago no configurado' },
        { status: 400 }
      );
    }

    console.log('🔧 Validando Access Token...');

    // Verificar token llamando a la API de usuarios de Mercado Pago
    const response = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const userData = await response.json();

    if (response.ok) {
      console.log('✅ Access Token válido:', userData.id);
      
      // Determinar entorno basado en el token
      const environment = accessToken.startsWith('TEST-') ? 'sandbox' : 'production';
      
      return NextResponse.json({
        valid: true,
        environment,
        user: {
          id: userData.id,
          email: userData.email,
          nickname: userData.nickname,
          first_name: userData.first_name,
          last_name: userData.last_name,
          country_id: userData.country_id,
          site_id: userData.site_id
        },
        organization_id: organizationId,
        token_prefix: accessToken.substring(0, 8) + '...'
      });
    } else {
      console.error('❌ Access Token inválido:', userData);
      
      return NextResponse.json({
        error: 'Access Token inválido o expirado',
        details: userData.message || 'Token no autorizado',
        mercadopago_error: userData
      }, { status: 401 });
    }

  } catch (error) {
    console.error('💥 Error validando token:', error);
    return NextResponse.json(
      { error: 'Error al validar token', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
} 