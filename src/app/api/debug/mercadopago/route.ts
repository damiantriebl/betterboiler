import { auth } from "@/auth";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Verificar clave de debug
    const url = new URL(request.url);
    const debugKey = url.searchParams.get("key");

    if (debugKey !== process.env.DEBUG_KEY && debugKey !== "DEBUG_KEY") {
      return NextResponse.json(
        { error: "Acceso denegado - clave de debug incorrecta" },
        { status: 403 },
      );
    }

    // Obtener sesión
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    // Variables de entorno de MercadoPago
    const mercadopagoConfig = {
      ACCESS_TOKEN: {
        present: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
        isTest: process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith("TEST-") || false,
        value: process.env.MERCADOPAGO_ACCESS_TOKEN
          ? `${process.env.MERCADOPAGO_ACCESS_TOKEN.substring(0, 10)}...`
          : "NO CONFIGURADO",
      },
      PUBLIC_KEY: {
        present: !!process.env.MERCADOPAGO_PUBLIC_KEY,
        isTest: process.env.MERCADOPAGO_PUBLIC_KEY?.startsWith("TEST-") || false,
        value: process.env.MERCADOPAGO_PUBLIC_KEY
          ? `${process.env.MERCADOPAGO_PUBLIC_KEY.substring(0, 10)}...`
          : "NO CONFIGURADO",
      },
      CLIENT_ID: {
        present: !!process.env.MERCADOPAGO_CLIENT_ID,
        value: process.env.MERCADOPAGO_CLIENT_ID
          ? `${process.env.MERCADOPAGO_CLIENT_ID.substring(0, 8)}...`
          : "NO CONFIGURADO",
      },
      CLIENT_SECRET: {
        present: !!process.env.MERCADOPAGO_CLIENT_SECRET,
        value: process.env.MERCADOPAGO_CLIENT_SECRET
          ? `${process.env.MERCADOPAGO_CLIENT_SECRET.substring(0, 8)}...`
          : "NO CONFIGURADO",
      },
    };

    // URLs configuradas
    const urlConfig = {
      BASE_URL: process.env.BASE_URL || "NO CONFIGURADO",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "NO CONFIGURADO",
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "NO CONFIGURADO",
      CURRENT_HOST: request.headers.get("host"),
      CURRENT_PROTOCOL: request.headers.get("x-forwarded-proto") || "http",
    };

    // Estado actual de integración
    const integrationStatus = {
      canDirectPayments:
        mercadopagoConfig.ACCESS_TOKEN.present && mercadopagoConfig.PUBLIC_KEY.present,
      canOAuth: mercadopagoConfig.CLIENT_ID.present && mercadopagoConfig.CLIENT_SECRET.present,
      environment: mercadopagoConfig.ACCESS_TOKEN.isTest ? "sandbox" : "production",
      httpsAvailable:
        urlConfig.CURRENT_PROTOCOL === "https" || urlConfig.BASE_URL?.startsWith("https"),
    };

    // Problemas detectados
    const issues = [];

    if (!mercadopagoConfig.ACCESS_TOKEN.present) {
      issues.push("❌ MERCADOPAGO_ACCESS_TOKEN no está configurado");
    }

    if (!mercadopagoConfig.PUBLIC_KEY.present) {
      issues.push("❌ MERCADOPAGO_PUBLIC_KEY no está configurado");
    }

    if (!mercadopagoConfig.CLIENT_ID.present) {
      issues.push("⚠️ MERCADOPAGO_CLIENT_ID no está configurado (OAuth no funcionará)");
    }

    if (!mercadopagoConfig.CLIENT_SECRET.present) {
      issues.push("⚠️ MERCADOPAGO_CLIENT_SECRET no está configurado (OAuth no funcionará)");
    }

    if (!integrationStatus.httpsAvailable && mercadopagoConfig.CLIENT_ID.present) {
      issues.push("⚠️ OAuth requiere HTTPS - usa localhost.run o configura HTTPS");
    }

    // URLs recomendadas para cada entorno
    const recommendedUrls = {
      development: {
        BASE_URL: "http://localhost:3001",
        NEXT_PUBLIC_APP_URL: "http://localhost:3001",
        note: "Para OAuth local usar: ssh -R 80:localhost:3001 ssh.localhost.run",
      },
      vercel: {
        BASE_URL: "https://apex-one-lemon.vercel.app",
        NEXT_PUBLIC_APP_URL: "https://apex-one-lemon.vercel.app",
        BETTER_AUTH_URL: "https://apex-one-lemon.vercel.app",
        BETTER_AUTH_TRUSTED_ORIGINS: "https://apex-one-lemon.vercel.app,https://*.vercel.app",
      },
    };

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      session: session
        ? {
            userId: session.user?.id,
            organizationId: session.user?.organizationId,
            email: session.user?.email,
          }
        : null,
      mercadopago: mercadopagoConfig,
      urls: urlConfig,
      integration: integrationStatus,
      issues,
      recommendations: {
        urls: recommendedUrls,
        next_steps: integrationStatus.canDirectPayments
          ? ["✅ Pagos directos funcionando", "Para OAuth: configurar CLIENT_ID + CLIENT_SECRET"]
          : [
              "Configurar ACCESS_TOKEN + PUBLIC_KEY",
              "Luego configurar CLIENT_ID + CLIENT_SECRET para OAuth",
            ],
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Error en diagnóstico",
        details: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
