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

    // Buscar usuario con información relacionada
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        accounts: {
          select: {
            providerId: true,
            accountId: true,
            createdAt: true
          }
        },
        sessions: {
          select: {
            id: true,
            expiresAt: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Información adicional de diagnóstico
    const debugInfo = {
      hasAccounts: user.accounts.length > 0,
      activeSessions: user.sessions.filter(s => s.expiresAt > new Date()).length,
      totalSessions: user.sessions.length
    };

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        role: user.role,
        organizationId: user.organizationId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      accounts: user.accounts,
      sessions: user.sessions,
      organization: user.organization,
      debug: debugInfo
    });

  } catch (error) {
    console.error('Error en debug de usuario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 