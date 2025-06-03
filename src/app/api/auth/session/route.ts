import { auth } from "@/auth"; // Asegúrate que esta ruta a tu config de better-auth sea correcta
import { headers as nextHeaders } from "next/headers"; // Renombrar para evitar colisión
import { NextResponse } from "next/server";

export async function GET() {
  const timestamp = new Date().toISOString();
  console.log(`🔍 [SESSION API] ${timestamp} - Iniciando proceso de obtención de sesión`);

  try {
    const readonlyHeaders = await nextHeaders();
    const standardHeaders = new Headers();
    readonlyHeaders.forEach((value, key) => {
      standardHeaders.append(key, value);
    });

    // Log de cookies recibidas
    const cookieHeader = standardHeaders.get("cookie") || "";
    console.log(`🍪 [SESSION API] Cookies recibidas: ${cookieHeader ? 'Sí' : 'No'}`);
    
    if (cookieHeader) {
      const relevantCookies = cookieHeader.split(';')
        .filter(cookie => cookie.includes('auth') || cookie.includes('session') || cookie.includes('better'))
        .map(cookie => cookie.trim());
      console.log(`🍪 [SESSION API] Cookies relevantes: ${relevantCookies.join(', ')}`);
    }

    console.log(`🔍 [SESSION API] Llamando a auth.api.getSession...`);
    const session = await auth.api.getSession({ headers: standardHeaders }); // Pasar Headers estándar

    console.log(`🔍 [SESSION API] Resultado de getSession:`, {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userRole: session?.user?.role,
      organizationId: session?.user?.organizationId
    });

    if (!session || !session.user) {
      console.log(`❌ [SESSION API] No se encontró sesión válida`);
      return NextResponse.json({ isAuthenticated: false, user: null }, { status: 200 });
    }

    console.log(`✅ [SESSION API] Sesión válida encontrada para usuario: ${session.user.email}`);

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
    console.error(`🚨 [SESSION API] Error obteniendo sesión:`, error);
    return NextResponse.json(
      { isAuthenticated: false, user: null, error: "Error al obtener la sesión" },
      { status: 500 },
    );
  }
}
