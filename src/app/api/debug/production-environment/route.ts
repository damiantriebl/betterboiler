import { requireOrganizationId } from "@/actions/util";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const organizationId = await requireOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    console.log("🌐 [PRODUCTION-ENV] Analizando entorno de producción...");

    // 1. Verificar entorno
    const isProduction = process.env.NODE_ENV === "production";
    const isVercel = !!process.env.VERCEL;
    const domain =
      process.env.VERCEL_URL || process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
    const currentDomain = request.headers.get("host");

    // 2. Verificar credenciales
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const publicKey = process.env.MERCADOPAGO_PUBLIC_KEY;
    const clientId = process.env.MERCADOPAGO_CLIENT_ID;
    const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;

    const envAnalysis = {
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isProduction,
        isVercel,
        currentDomain,
        configuredDomain: domain,
        vercelUrl: process.env.VERCEL_URL,
        baseUrl: process.env.BASE_URL,
        publicUrl: process.env.NEXT_PUBLIC_APP_URL,
      },
      credentials: {
        hasAccessToken: !!accessToken,
        hasPublicKey: !!publicKey,
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        accessTokenType: accessToken
          ? accessToken.startsWith("APP_USR-")
            ? "PRODUCCIÓN"
            : accessToken.startsWith("TEST-")
              ? "TEST"
              : "DESCONOCIDO"
          : "NO_CONFIGURADO",
        publicKeyType: publicKey
          ? publicKey.startsWith("APP_USR-")
            ? "PRODUCCIÓN"
            : publicKey.startsWith("TEST-")
              ? "TEST"
              : "DESCONOCIDO"
          : "NO_CONFIGURADO",
      },
    };

    // 3. Verificar URLs de aplicación
    const expectedUrls = {
      callback: `https://${currentDomain}/api/configuration/mercadopago/callback`,
      webhook: `https://${currentDomain}/api/webhooks/mercadopago`,
      processPayment: `https://${currentDomain}/api/mercadopago/process-payment`,
    };

    // 4. Test de conectividad MercadoPago
    let mpConnectivityTest = null;
    if (accessToken) {
      try {
        console.log("🧪 [PRODUCTION-ENV] Probando conectividad con MercadoPago...");

        const response = await fetch("https://api.mercadopago.com/users/me", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        const userData = await response.json();

        mpConnectivityTest = {
          status: response.status,
          success: response.ok,
          userData: response.ok
            ? {
                id: userData.id,
                email: userData.email,
                site_id: userData.site_id,
                country_id: userData.country_id,
                live_mode: userData.live_mode,
              }
            : null,
          error: !response.ok ? userData : null,
        };
      } catch (error) {
        mpConnectivityTest = {
          status: "ERROR",
          success: false,
          error: error instanceof Error ? error.message : "Error de conexión",
        };
      }
    }

    // 5. Verificar configuración de aplicación en MP
    let appStatusTest = null;
    if (accessToken?.startsWith("APP_USR-")) {
      try {
        console.log("🏭 [PRODUCTION-ENV] Verificando estado de aplicación en MercadoPago...");

        // Verificar applications endpoint
        const appResponse = await fetch("https://api.mercadopago.com/applications", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        const appData = await appResponse.json();

        appStatusTest = {
          status: appResponse.status,
          success: appResponse.ok,
          data: appResponse.ok ? appData : null,
          error: !appResponse.ok ? appData : null,
        };
      } catch (error) {
        appStatusTest = {
          status: "ERROR",
          success: false,
          error: error instanceof Error ? error.message : "Error verificando aplicación",
        };
      }
    }

    // 6. Generar problemas y soluciones específicos para producción
    const problems = [];
    const solutions = [];

    // Problemas de entorno
    if (!isProduction) {
      problems.push('⚠️ NODE_ENV no está configurado como "production"');
      solutions.push("🔧 Configura NODE_ENV=production en Vercel");
    }

    // Problemas de credenciales
    if (!accessToken || !publicKey) {
      problems.push("❌ Credenciales de MercadoPago no configuradas en Vercel");
      solutions.push("🔧 Configura variables de entorno en Vercel Dashboard");
    }

    if (accessToken && !accessToken.startsWith("APP_USR-")) {
      problems.push("❌ Usando credenciales TEST en ambiente de producción");
      solutions.push("🔧 Cambia a credenciales de PRODUCCIÓN (APP_USR-) en Vercel");
    }

    // Problemas de conectividad
    if (mpConnectivityTest && !mpConnectivityTest.success) {
      problems.push("❌ No se puede conectar con la API de MercadoPago");
      if (mpConnectivityTest.error?.message?.includes("unauthorized")) {
        solutions.push(
          "🔧 Verifica que tu aplicación esté ACTIVADA para producción en MercadoPago",
        );
        solutions.push("🔧 Completa las certificaciones requeridas");
      } else {
        solutions.push("🔧 Verifica que las credenciales sean válidas");
      }
    }

    // Problemas de configuración de aplicación
    if (appStatusTest && !appStatusTest.success) {
      problems.push("❌ Aplicación no configurada correctamente en MercadoPago");
      solutions.push("🔧 Configura URLs de callback en tu aplicación de MercadoPago");
      solutions.push("🔧 Activa tu aplicación para producción");
    }

    // 7. Preparar respuesta
    return NextResponse.json({
      diagnosis: "Análisis específico para entorno de producción (Vercel)",
      envAnalysis,
      expectedUrls,
      mpConnectivityTest,
      appStatusTest,
      problems,
      solutions,
      vercelSpecificSteps: [
        "1. 🌐 Ve a Vercel Dashboard → tu-proyecto → Settings → Environment Variables",
        "2. 🔑 Agrega/verifica las variables MERCADOPAGO_* como Production",
        "3. 🔄 Redeploy tu aplicación después de cambiar variables",
        "4. 🧪 Prueba el endpoint de diagnóstico en producción",
        "5. 🔗 Configura URLs de producción en MercadoPago",
      ],
      mercadopagoSteps: [
        "1. 📱 Ve a https://www.mercadopago.com.ar/developers/panel/applications",
        "2. 📝 Selecciona tu aplicación",
        `3. 🔗 Configura Redirect URI: ${expectedUrls.callback}`,
        `4. 🔔 Configura Webhook URL: ${expectedUrls.webhook}`,
        "5. ✅ Activa tu aplicación para PRODUCCIÓN",
        "6. 🎯 Completa las certificaciones requeridas",
      ],
      testUrls: {
        productionDiagnostic: `https://${currentDomain}/debug/unauthorized-fix`,
        testSandbox: `https://${currentDomain}/api/payments/mercadopago/test`,
        testProduction: `https://${currentDomain}/api/payments/mercadopago/test-production`,
        configurationPage: `https://${currentDomain}/configuration`,
      },
      critical:
        problems.length > 0
          ? "Se detectaron problemas críticos que impiden el funcionamiento en producción"
          : "Configuración básica correcta - revisar problemas específicos de MercadoPago",
    });
  } catch (error) {
    console.error("💥 [PRODUCTION-ENV] Error:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
