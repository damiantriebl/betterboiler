import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "No se encontró sesión válida" }, { status: 401 });
    }

    console.log("🧪 [TEST-BRICK] Probando configuración para:", session.user.organizationId);

    // Obtener configuración OAuth de la organización
    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: {
        organizationId: session.user.organizationId,
      },
    });

    console.log("🔍 [TEST-BRICK] Configuración encontrada:", {
      organizationId: session.user.organizationId,
      configExists: !!oauthConfig,
      hasAccessToken: !!oauthConfig?.accessToken,
      hasPublicKey: !!oauthConfig?.publicKey,
      publicKeyType: typeof oauthConfig?.publicKey,
      accessTokenType: typeof oauthConfig?.accessToken,
      publicKeyLength: oauthConfig?.publicKey?.length || 0,
      accessTokenLength: oauthConfig?.accessToken?.length || 0,
      publicKeyStart: oauthConfig?.publicKey?.substring(0, 15) || "NO_KEY",
      accessTokenStart: oauthConfig?.accessToken?.substring(0, 15) || "NO_TOKEN",
    });

    if (!oauthConfig) {
      return NextResponse.json({
        success: false,
        error: "No hay configuración OAuth",
        details: "Debe conectar MercadoPago primero",
      });
    }

    if (!oauthConfig.accessToken) {
      return NextResponse.json({
        success: false,
        error: "No hay access token",
        details: "Reconecte MercadoPago para obtener access token",
      });
    }

    if (!oauthConfig.publicKey) {
      return NextResponse.json({
        success: false,
        error: "No hay public key",
        details: "Configure manualmente la public key",
      });
    }

    // Test 1: Probar creación de preferencia simple
    try {
      const testPreferenceData = {
        items: [
          {
            title: "Test de Configuración MercadoPago",
            unit_price: 100,
            quantity: 1,
            id: "test-item",
            description: "Prueba de configuración después de configuración manual",
          },
        ],
        purpose: "wallet_purchase",
        back_urls: {
          success: `${process.env.BASE_URL}/sales/success`,
          failure: `${process.env.BASE_URL}/sales/failure`,
          pending: `${process.env.BASE_URL}/sales/pending`,
        },
        auto_return: "approved",
        external_reference: `test-${Date.now()}`,
        metadata: {
          organization_id: session.user.organizationId,
          test: true,
        },
      };

      console.log("🧪 [TEST-BRICK] Probando creación de preferencia...");

      const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${oauthConfig.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testPreferenceData),
      });

      const responseText = await response.text();
      console.log("🔍 [TEST-BRICK] Respuesta de preferencia:", {
        status: response.status,
        ok: response.ok,
        responseLength: responseText.length,
      });

      if (!response.ok) {
        console.error("❌ [TEST-BRICK] Error creando preferencia:", responseText);
        return NextResponse.json({
          success: false,
          step: "create_preference",
          error: "Error al crear preferencia de prueba",
          details: responseText,
          status: response.status,
          configuration: {
            hasAccessToken: !!oauthConfig.accessToken,
            hasPublicKey: !!oauthConfig.publicKey,
            accessTokenLength: oauthConfig.accessToken.length,
            publicKeyLength: oauthConfig.publicKey.length,
          },
        });
      }

      const preference = JSON.parse(responseText);
      console.log("✅ [TEST-BRICK] Preferencia creada exitosamente:", preference.id);

      // Test 2: Verificar que la public key es válida (formato)
      const isValidPublicKey = /^(TEST-|APP_USR-|PROD-)?[a-zA-Z0-9_-]+$/i.test(
        oauthConfig.publicKey,
      );

      return NextResponse.json({
        success: true,
        message: "Configuración verificada exitosamente",
        tests: {
          create_preference: {
            success: true,
            preferenceId: preference.id,
            initPoint: preference.init_point,
          },
          public_key_format: {
            success: isValidPublicKey,
            format: isValidPublicKey ? "VÁLIDO" : "INVÁLIDO",
          },
        },
        configuration: {
          hasAccessToken: true,
          hasPublicKey: true,
          publicKey: `${oauthConfig.publicKey.substring(0, 20)}...`,
          accessTokenLength: oauthConfig.accessToken.length,
          publicKeyLength: oauthConfig.publicKey.length,
          isTest: oauthConfig.publicKey.includes("TEST"),
          isProduction: oauthConfig.publicKey.startsWith("APP_USR"),
        },
        nextSteps: [
          "La configuración básica está funcionando",
          "Puedes probar el checkout desde la página de ventas",
          "El brick debería aparecer correctamente ahora",
        ],
      });
    } catch (preferenceError) {
      console.error("❌ [TEST-BRICK] Error en prueba de preferencia:", preferenceError);
      return NextResponse.json({
        success: false,
        step: "create_preference",
        error: "Error al probar la configuración",
        details: preferenceError instanceof Error ? preferenceError.message : "Error desconocido",
        configuration: {
          hasAccessToken: !!oauthConfig.accessToken,
          hasPublicKey: !!oauthConfig.publicKey,
        },
      });
    }
  } catch (error) {
    console.error("💥 [TEST-BRICK] Error general:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
