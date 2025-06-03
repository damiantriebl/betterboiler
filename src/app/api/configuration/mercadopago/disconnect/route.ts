import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

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

    console.log('🔌 [OAUTH DISCONNECT] Desconectando MercadoPago:', {
      organizationId: session.user.organizationId,
      userId: session.user.id
    });

    // Eliminar configuración OAuth principal
    const deletedOAuth = await prisma.mercadoPagoOAuth.deleteMany({
      where: {
        organizationId: session.user.organizationId
      }
    });

    // Eliminar también configuraciones temporales si existen
    const deletedTemp = await prisma.mercadoPagoOAuthTemp.deleteMany({
      where: {
        organizationId: session.user.organizationId
      }
    }).catch(() => {
      // Ignorar errores si el modelo no existe aún
      console.warn('⚠️ [OAUTH DISCONNECT] No se pudo limpiar OAuth temporal (probablemente no existe)');
      return { count: 0 };
    });

    console.log('✅ [OAUTH DISCONNECT] Limpieza completada:', {
      oauthDeleted: deletedOAuth.count,
      tempDeleted: deletedTemp.count,
      organizationId: session.user.organizationId
    });

    return NextResponse.json({
      success: true,
      message: 'Organización desconectada de MercadoPago exitosamente',
      cleaned: {
        oauthConfigs: deletedOAuth.count,
        tempConfigs: deletedTemp.count
      }
    });

  } catch (error) {
    console.error('❌ [OAUTH DISCONNECT] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido',
        stack: process.env.NODE_ENV === 'development' ? (error as Error)?.stack : undefined
      },
      { status: 500 }
    );
  }
} 