import { requireOrganizationId } from "@/actions/util";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const organizationId = await requireOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar credenciales globales (.env)
    const globalAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const globalPublicKey = process.env.MERCADOPAGO_PUBLIC_KEY;

    // Verificar credenciales OAuth (base de datos)
    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: {
        organizationId: organizationId,
      },
    });

    // Analizar CADA credencial individualmente
    const analysis = {
      global: {
        accessToken: {
          exists: !!globalAccessToken,
          type: globalAccessToken?.startsWith("TEST-")
            ? "TEST"
            : globalAccessToken?.startsWith("APP_USR-")
              ? "PRODUCTION"
              : "UNKNOWN",
          preview: globalAccessToken ? `${globalAccessToken.substring(0, 15)}...` : "NO_TOKEN",
        },
        publicKey: {
          exists: !!globalPublicKey,
          type: globalPublicKey?.startsWith("TEST-")
            ? "TEST"
            : globalPublicKey?.startsWith("APP_USR-")
              ? "PRODUCTION"
              : "UNKNOWN",
          preview: globalPublicKey ? `${globalPublicKey.substring(0, 15)}...` : "NO_KEY",
        },
      },
      oauth: {
        accessToken: {
          exists: !!oauthConfig?.accessToken,
          type: oauthConfig?.accessToken?.startsWith("TEST-")
            ? "TEST"
            : oauthConfig?.accessToken?.startsWith("APP_USR-")
              ? "PRODUCTION"
              : "UNKNOWN",
          preview: oauthConfig?.accessToken
            ? `${oauthConfig.accessToken.substring(0, 15)}...`
            : "NO_TOKEN",
        },
        publicKey: {
          exists: !!oauthConfig?.publicKey,
          type: oauthConfig?.publicKey?.startsWith("TEST-")
            ? "TEST"
            : oauthConfig?.publicKey?.startsWith("APP_USR-")
              ? "PRODUCTION"
              : "UNKNOWN",
          preview: oauthConfig?.publicKey
            ? `${oauthConfig.publicKey.substring(0, 15)}...`
            : "NO_KEY",
        },
      },
    };

    // Detectar inconsistencias
    const inconsistencies = [];

    // Verificar inconsistencias en credenciales globales
    if (
      analysis.global.accessToken.exists &&
      analysis.global.publicKey.exists &&
      analysis.global.accessToken.type !== analysis.global.publicKey.type
    ) {
      inconsistencies.push({
        scope: "global",
        issue: "ACCESS_TOKEN y PUBLIC_KEY tienen tipos diferentes",
        accessToken: analysis.global.accessToken.type,
        publicKey: analysis.global.publicKey.type,
      });
    }

    // Verificar inconsistencias en credenciales OAuth
    if (
      analysis.oauth.accessToken.exists &&
      analysis.oauth.publicKey.exists &&
      analysis.oauth.accessToken.type !== analysis.oauth.publicKey.type
    ) {
      inconsistencies.push({
        scope: "oauth",
        issue: "ACCESS_TOKEN y PUBLIC_KEY tienen tipos diferentes",
        accessToken: analysis.oauth.accessToken.type,
        publicKey: analysis.oauth.publicKey.type,
      });
    }

    // Verificar qué credenciales se están usando para pagos
    const paymentCredentials = {
      source: oauthConfig?.accessToken ? "oauth" : "global",
      accessToken: oauthConfig?.accessToken || globalAccessToken,
      publicKey: oauthConfig?.publicKey || globalPublicKey,
    };

    const paymentEnvironment = paymentCredentials.accessToken?.startsWith("TEST-")
      ? "TEST"
      : paymentCredentials.accessToken?.startsWith("APP_USR-")
        ? "PRODUCTION"
        : "UNKNOWN";

    return NextResponse.json({
      organizationId,
      analysis,
      inconsistencies,
      paymentCredentials: {
        source: paymentCredentials.source,
        accessTokenType: paymentCredentials.accessToken?.startsWith("TEST-")
          ? "TEST"
          : paymentCredentials.accessToken?.startsWith("APP_USR-")
            ? "PRODUCTION"
            : "UNKNOWN",
        publicKeyType: paymentCredentials.publicKey?.startsWith("TEST-")
          ? "TEST"
          : paymentCredentials.publicKey?.startsWith("APP_USR-")
            ? "PRODUCTION"
            : "UNKNOWN",
        environment: paymentEnvironment,
        accessTokenPreview: paymentCredentials.accessToken
          ? `${paymentCredentials.accessToken.substring(0, 15)}...`
          : "NO_TOKEN",
        publicKeyPreview: paymentCredentials.publicKey
          ? `${paymentCredentials.publicKey.substring(0, 15)}...`
          : "NO_KEY",
      },
      hasInconsistencies: inconsistencies.length > 0,
      recommendation:
        inconsistencies.length > 0
          ? "CRITICAL: Hay inconsistencias en las credenciales que pueden causar errores"
          : `Credenciales consistentes (${paymentEnvironment})`,
    });
  } catch (error) {
    console.error("Error en análisis detallado:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
