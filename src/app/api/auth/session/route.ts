import { auth } from "@/auth"; // Asegúrate que esta ruta a tu config de better-auth sea correcta
import { headers as nextHeaders } from "next/headers"; // Renombrar para evitar colisión
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const readonlyHeaders = await nextHeaders();
    const standardHeaders = new Headers();
    readonlyHeaders.forEach((value, key) => {
      standardHeaders.append(key, value);
    });

    const session = await auth.api.getSession({ headers: standardHeaders }); // Pasar Headers estándar

    if (!session || !session.user) {
      return NextResponse.json({ isAuthenticated: false, user: null }, { status: 200 });
    }

    // Devuelve la información relevante del usuario.
    // ¡Ten cuidado de no exponer información sensible que el cliente no necesite!
    return NextResponse.json(
      {
        isAuthenticated: true,
        user: {
          id: session.user.id,
          email: session.user.email, // Ejemplo
          name: session.user.name, // Ejemplo
          organizationId: session.user.organizationId, // Ejemplo
          // Añade otros campos del usuario que sean seguros y necesarios para el cliente
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[API getSession] Error getting session:", error);
    return NextResponse.json(
      { isAuthenticated: false, user: null, error: "Error al obtener la sesión" },
      { status: 500 },
    );
  }
}
