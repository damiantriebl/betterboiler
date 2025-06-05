import { requireOrganizationId } from "@/actions/util";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const organizationId = await requireOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    console.log("🔍 [UNAUTHORIZED-DIAGNOSTIC] Analizando problema de credenciales...");

    // 1. Verificar configuración de credenciales
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const publicKey = process.env.MERCADOPAGO_PUBLIC_KEY;

    if (!accessToken || !publicKey) {
      return NextResponse.json({
        error: "Credenciales no configuradas",
        solution: "Configura MERCADOPAGO_ACCESS_TOKEN y MERCADOPAGO_PUBLIC_KEY en .env.local",
      });
    }

    const isTestAccess = accessToken.startsWith("TEST-");
    const isTestPublic = publicKey.startsWith("TEST-");
    const isProdAccess = accessToken.startsWith("APP_USR-");
    const isProdPublic = publicKey.startsWith("APP_USR-");

    // 2. Verificar consistencia
    const credentialAnalysis = {
      accessToken: {
        type: isTestAccess ? "TEST" : isProdAccess ? "PRODUCCIÓN" : "DESCONOCIDO",
        value: `${accessToken.substring(0, 15)}...`,
        valid: isTestAccess || isProdAccess,
      },
      publicKey: {
        type: isTestPublic ? "TEST" : isProdPublic ? "PRODUCCIÓN" : "DESCONOCIDO",
        value: `${publicKey.substring(0, 15)}...`,
        valid: isTestPublic || isProdPublic,
      },
      consistent: (isTestAccess && isTestPublic) || (isProdAccess && isProdPublic),
    };

    // 3. Probar conectividad con MercadoPago
    let mpApiTest = null;
    try {
      console.log("🧪 [UNAUTHORIZED-DIAGNOSTIC] Probando API de MercadoPago...");

      const response = await fetch("https://api.mercadopago.com/users/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      const userData = await response.json();

      mpApiTest = {
        status: response.status,
        success: response.ok,
        userData: response.ok
          ? {
              id: userData.id,
              email: userData.email,
              site_id: userData.site_id,
              country_id: userData.country_id,
            }
          : null,
        error: !response.ok ? userData : null,
      };
    } catch (error) {
      mpApiTest = {
        status: "ERROR",
        success: false,
        error: error instanceof Error ? error.message : "Error de conexión",
      };
    }

    // 4. Verificar configuración de aplicación
    let appConfigTest = null;
    if (isProdAccess) {
      try {
        console.log("🏭 [UNAUTHORIZED-DIAGNOSTIC] Verificando configuración de aplicación...");

        const appResponse = await fetch("https://api.mercadopago.com/applications", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        const appData = await appResponse.json();

        appConfigTest = {
          status: appResponse.status,
          success: appResponse.ok,
          data: appResponse.ok ? appData : null,
          error: !appResponse.ok ? appData : null,
        };
      } catch (error) {
        appConfigTest = {
          status: "ERROR",
          success: false,
          error: error instanceof Error ? error.message : "Error verificando aplicación",
        };
      }
    }

    // 5. Generar diagnóstico
    const problems = [];
    const solutions = [];

    if (!credentialAnalysis.consistent) {
      problems.push(
        "❌ Credenciales inconsistentes - AccessToken y PublicKey de diferentes ambientes",
      );
      solutions.push("🔧 Usa credenciales del mismo ambiente (ambas TEST- o ambas APP_USR-)");
    }

    if (isProdAccess && (!mpApiTest?.success || mpApiTest?.error)) {
      problems.push("❌ Credenciales de producción no válidas o aplicación no configurada");
      solutions.push("🔧 Verifica que tu aplicación esté ACTIVADA para producción en MercadoPago");
      solutions.push("🔧 Completa las certificaciones requeridas en el panel de desarrolladores");
    }

    if (isProdAccess && mpApiTest?.success) {
      problems.push("⚠️ Usando credenciales de PRODUCCIÓN - Solo para pagos REALES");
      solutions.push("💡 Asegúrate de usar datos REALES del comprador");
      solutions.push("💡 El token debe generarse con tarjeta REAL y public key de PRODUCCIÓN");
      solutions.push("💡 Configura correctamente las URLs de tu aplicación en MercadoPago");
    }

    // 6. Preparar respuesta
    return NextResponse.json({
      diagnosis: 'Análisis completo del error "Unauthorized use of live credentials"',
      credentialAnalysis,
      mpApiTest,
      appConfigTest,
      problems,
      solutions,
      recommendations: {
        immediate: isProdAccess
          ? [
              "1. 🔄 Cambia temporalmente a credenciales TEST- para desarrollo",
              "2. 🧪 Usa /api/payments/mercadopago/test para testing",
              "3. 🏭 Solo usa producción cuando tengas datos reales",
            ]
          : [
              "1. ✅ Usa credenciales TEST- para desarrollo",
              "2. 🧪 Prueba con /api/payments/mercadopago/test",
              "3. 🏭 Cambia a APP_USR- solo para producción real",
            ],
        production: [
          "1. 📋 Verifica que tu aplicación esté activada en MercadoPago",
          "2. 🎯 Completa todas las certificaciones requeridas",
          "3. 🔗 Configura URLs correctas en el panel de desarrolladores",
          "4. 💳 Usa solo datos REALES de compradores",
          "5. 🔑 Genera tokens con public key de PRODUCCIÓN",
        ],
      },
      nextSteps: {
        debug: "/debug/mercadopago-fix",
        testSandbox: "/api/payments/mercadopago/test",
        testProduction: "/api/payments/mercadopago/test-production",
        mpPanel: "https://www.mercadopago.com.ar/developers/panel/applications",
      },
    });
  } catch (error) {
    console.error("💥 [UNAUTHORIZED-DIAGNOSTIC] Error:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
