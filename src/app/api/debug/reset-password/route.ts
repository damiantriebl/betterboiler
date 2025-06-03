import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      );
    }

    // Usar la API de better-auth para enviar reset
    try {
      const resetResult = await auth.api.forgetPassword({
        body: { email },
        headers: request.headers
      });

      console.log(`🔄 Reset de password enviado para: ${email}`);
      console.log('📧 Revisa la consola del servidor para ver el link de reset');

      return NextResponse.json({
        success: true,
        message: 'Email de reset enviado. Revisa la consola del servidor para ver el link.'
      });

    } catch (authError) {
      console.error('Error enviando reset de password:', authError);
      return NextResponse.json({
        success: false,
        message: 'Error enviando reset de password',
        error: authError instanceof Error ? authError.message : 'Error desconocido'
      });
    }

  } catch (error) {
    console.error('Error en reset de password:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 