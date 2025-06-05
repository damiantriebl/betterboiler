import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID es requerido" }, { status: 400 });
    }

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Forzar la verificación del email
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Email verificado forzadamente para usuario: ${user.email}`);

    return NextResponse.json({
      success: true,
      message: "Email verificado exitosamente",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        emailVerified: updatedUser.emailVerified,
      },
    });
  } catch (error) {
    console.error("Error verificando usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
