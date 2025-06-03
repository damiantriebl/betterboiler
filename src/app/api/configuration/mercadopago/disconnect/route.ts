import { NextRequest, NextResponse } from 'next/server';
import { requireOrganizationId } from '@/actions/util';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const organizationId = await requireOrganizationId();
    if (!organizationId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Eliminar la configuración OAuth de esta organización
    await prisma.mercadoPagoOAuth.delete({
      where: {
        organizationId: organizationId
      }
    });

    console.log('✅ OAuth de Mercado Pago desconectado para organización:', organizationId);

    return NextResponse.json({
      success: true,
      message: 'Mercado Pago desconectado exitosamente'
    });

  } catch (error) {
    console.error('Error desconectando Mercado Pago:', error);
    
    // Si el error es que no existe, también es un éxito
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({
        success: true,
        message: 'Mercado Pago ya estaba desconectado'
      });
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 