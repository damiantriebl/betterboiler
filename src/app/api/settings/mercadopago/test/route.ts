import { NextRequest, NextResponse } from 'next/server';
import { requireOrganizationId } from '@/actions/util';

export async function POST(request: NextRequest) {
  try {
    await requireOrganizationId(); // Verificar autenticación

    const { access_token } = await request.json();

    if (!access_token) {
      return NextResponse.json(
        { error: 'Access token requerido' },
        { status: 400 }
      );
    }

    // Probar la conexión consultando datos de la cuenta
    const response = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { 
          error: 'Credenciales inválidas o expiradas',
          details: errorData
        },
        { status: 401 }
      );
    }

    const userData = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Conexión exitosa con Mercado Pago',
      account: {
        id: userData.id,
        email: userData.email,
        country_id: userData.country_id,
        site_id: userData.site_id
      }
    });

  } catch (error) {
    console.error('Error probando conexión de MP:', error);
    return NextResponse.json(
      { error: 'Error al probar la conexión' },
      { status: 500 }
    );
  }
} 