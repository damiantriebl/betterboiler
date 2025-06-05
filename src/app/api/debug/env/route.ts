import { NextResponse } from "next/server";

export async function GET() {
  try {
    const envVars = {
      BASE_URL: process.env.BASE_URL || "NO CONFIGURADO",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "NO CONFIGURADO",
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "NO CONFIGURADO",
      NODE_ENV: process.env.NODE_ENV || "NO CONFIGURADO",
      // No mostrar credenciales completas por seguridad
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "CONFIGURADO" : "NO CONFIGURADO",
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "CONFIGURADO" : "NO CONFIGURADO",
      MERCADOPAGO_CLIENT_ID: process.env.MERCADOPAGO_CLIENT_ID ? "CONFIGURADO" : "NO CONFIGURADO",
      MERCADOPAGO_CLIENT_SECRET: process.env.MERCADOPAGO_CLIENT_SECRET
        ? "CONFIGURADO"
        : "NO CONFIGURADO",
    };

    return NextResponse.json({
      message: "Variables de entorno para debugging",
      environment: envVars,
      recommendations: {
        BASE_URL: "Debe ser http://localhost:3000 para desarrollo local",
        NEXT_PUBLIC_APP_URL: "Debe ser http://localhost:3000 para desarrollo local",
        BETTER_AUTH_URL: "Variable obsoleta, no necesaria con los cambios realizados",
      },
    });
  } catch (error) {
    console.error("Error verificando variables de entorno:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
