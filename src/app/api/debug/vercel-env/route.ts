import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Solo en desarrollo o con clave específica
    const debugKey = request.nextUrl.searchParams.get("key");
    if (process.env.NODE_ENV === "production" && debugKey !== process.env.DEBUG_KEY) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Variables de entorno críticas
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      BASE_URL: process.env.BASE_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
      VERCEL_URL: process.env.VERCEL_URL,
    };

    // Detectar problemas comunes
    const issues = [];

    // Buscar referencias a ngrok
    for (const [key, value] of Object.entries(envVars)) {
      if (value?.includes("ngrok")) {
        issues.push({
          type: "NGROK_REFERENCE",
          variable: key,
          value: value,
          message: `❌ ${key} todavía apunta a ngrok`,
        });
      }
    }

    // Verificar URLs de producción
    if (process.env.NODE_ENV === "production") {
      if (!envVars.NEXT_PUBLIC_APP_URL) {
        issues.push({
          type: "MISSING_PUBLIC_URL",
          message: "❌ NEXT_PUBLIC_APP_URL no está configurada en producción",
        });
      }

      if (envVars.NEXT_PUBLIC_APP_URL && !envVars.NEXT_PUBLIC_APP_URL.startsWith("https://")) {
        issues.push({
          type: "INSECURE_URL",
          variable: "NEXT_PUBLIC_APP_URL",
          value: envVars.NEXT_PUBLIC_APP_URL,
          message: "❌ NEXT_PUBLIC_APP_URL debe usar HTTPS en producción",
        });
      }
    }

    // Información de request
    const requestInfo = {
      origin: request.nextUrl.origin,
      host: request.headers.get("host"),
      "x-forwarded-host": request.headers.get("x-forwarded-host"),
      "x-forwarded-proto": request.headers.get("x-forwarded-proto"),
    };

    // Configuración recomendada
    const recommendedConfig = {
      development: {
        BASE_URL: "http://localhost:3001",
        NEXT_PUBLIC_APP_URL: "http://localhost:3001",
        note: "Para desarrollo local (puerto 3001 porque 3000 está ocupado)",
      },
      production: {
        BASE_URL: request.nextUrl.origin,
        NEXT_PUBLIC_APP_URL: request.nextUrl.origin,
        BETTER_AUTH_URL: request.nextUrl.origin,
        note: "Variables recomendadas para Vercel",
      },
    };

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      currentConfig: envVars,
      requestInfo,
      issues,
      hasIssues: issues.length > 0,
      recommendedConfig,
      nextSteps:
        issues.length > 0
          ? [
              "1. Ve al dashboard de Vercel",
              "2. Busca tu proyecto",
              "3. Ve a Settings > Environment Variables",
              "4. Actualiza las variables problemáticas",
              "5. Redeploy el proyecto",
            ]
          : ["✅ Configuración correcta"],
    });
  } catch (error) {
    console.error("Error en debug de Vercel:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
