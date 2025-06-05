import { auth } from "@/auth";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "No hay sesión activa" }, { status: 401 });
    }

    // Devolver información básica de la sesión (sin datos sensibles)
    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        organizationId: session.user.organizationId,
      },
    });
  } catch (error) {
    console.error("Error obteniendo sesión:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
