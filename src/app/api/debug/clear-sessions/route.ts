import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      );
    }

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Limpiar todas las sesiones del usuario
    const deletedSessions = await prisma.session.deleteMany({
      where: {
        userId: user.id
      }
    });

    // Asegurar que el email esté verificado para evitar problemas
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        updatedAt: new Date()
      }
    });

    console.log(`🧹 Limpiadas ${deletedSessions.count} sesiones para usuario: ${email}`);
    console.log(`✅ Email verificado para usuario: ${email}`);

    return NextResponse.json({
      success: true,
      message: `Limpiadas ${deletedSessions.count} sesiones y email verificado`,
      deletedSessions: deletedSessions.count,
      emailVerified: true
    });

  } catch (error) {
    console.error('Error limpiando sesiones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 