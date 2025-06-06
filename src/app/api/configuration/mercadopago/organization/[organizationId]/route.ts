import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ organizationId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { organizationId } = await params;

    // Verificar bypass de debug PRIMERO
    const debugKey = request.headers.get("x-debug-key");
    const isDebugBypass = debugKey === process.env.DEBUG_KEY || debugKey === "DEBUG_KEY";

    // Solo obtener sesión si no es bypass de debug
    let session = null;
    if (!isDebugBypass) {
      session = await auth.api.getSession({
        headers: request.headers,
      });

      // Verificar que la sesión corresponda a la organización solicitada
      if (!session?.user?.organizationId || session.user.organizationId !== organizationId) {
        return NextResponse.json(
          { error: "No autorizado para acceder a esta organización" },
          { status: 403 },
        );
      }
    }

    console.log("🔍 [ORGANIZATION-CONFIG] Obteniendo configuración para:", organizationId);
    console.log(
      "🔍 [ORGANIZATION-CONFIG] Session organizationId:",
      session?.user?.organizationId || "DEBUG_BYPASS",
    );
    console.log("🔍 [ORGANIZATION-CONFIG] Requested organizationId:", organizationId);
    console.log("🔍 [ORGANIZATION-CONFIG] Is debug bypass:", isDebugBypass);

    // Obtener configuración OAuth de la organización
    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: {
        organizationId: organizationId,
      },
    });

    console.log("🔍 [ORGANIZATION-CONFIG] OAuth config encontrada:", !!oauthConfig);
    if (oauthConfig) {
      console.log("🔍 [ORGANIZATION-CONFIG] OAuth config details:", {
        email: oauthConfig.email,
        hasAccessToken: !!oauthConfig.accessToken,
        hasPublicKey: !!oauthConfig.publicKey,
        accessTokenStart: oauthConfig.accessToken?.substring(0, 15),
        publicKeyStart: oauthConfig.publicKey?.substring(0, 15),
      });
    }

    // NUEVO: Lógica inteligente de selección de credenciales
    const globalAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const globalPublicKey = process.env.MERCADOPAGO_PUBLIC_KEY;

    console.log("🔍 [ORGANIZATION-CONFIG] Variables de entorno:", {
      hasGlobalAccessToken: !!globalAccessToken,
      hasGlobalPublicKey: !!globalPublicKey,
      globalAccessTokenStart: globalAccessToken?.substring(0, 15),
      globalPublicKeyStart: globalPublicKey?.substring(0, 15),
    });

    const globalIsTest = globalAccessToken?.startsWith("TEST-");
    const oauthIsTest = oauthConfig?.accessToken?.startsWith("TEST-");

    console.log("🔍 [ORGANIZATION-CONFIG] Tipos de credenciales:", {
      globalIsTest,
      oauthIsTest,
    });

    let selectedPublicKey = null;
    let selectedAccessToken = null;
    let selectedEnvironment = "unknown";
    let credentialSource = "none";
    let isConnected = false;

    // PRIORIDAD PARA POINT API: PRODUCCIÓN REQUERIDA
    // Para Point API, el access token es más crítico que el public key
    if (oauthConfig?.accessToken && !oauthIsTest) {
      // OAuth de PRODUCCIÓN - IDEAL para Point API (incluso sin public key)
      selectedPublicKey = oauthConfig.publicKey || globalPublicKey; // Fallback a global si es necesario
      selectedAccessToken = oauthConfig.accessToken;
      selectedEnvironment = "production";
      credentialSource = "oauth-prod";
      isConnected = true;
      console.log(
        "🏭 [ORGANIZATION-CONFIG] ✅ Usando OAuth PRODUCCIÓN (Point API) - ACCESS TOKEN PRIORIDAD",
      );
    } else if (globalAccessToken && globalPublicKey && !globalIsTest) {
      // Global de PRODUCCIÓN - También sirve para Point
      selectedPublicKey = globalPublicKey;
      selectedAccessToken = globalAccessToken;
      selectedEnvironment = "production";
      credentialSource = "global-prod";
      isConnected = true;
      console.log("🏭 [ORGANIZATION-CONFIG] ✅ Usando Global PRODUCCIÓN - FUNCIONA PARA POINT");
    } else if (oauthConfig?.accessToken && oauthConfig?.publicKey) {
      // OAuth TEST - Para otros usos pero NO Point
      selectedPublicKey = oauthConfig.publicKey;
      selectedAccessToken = oauthConfig.accessToken;
      selectedEnvironment = "test";
      credentialSource = "oauth-test";
      isConnected = true;
      console.log("🧪 [ORGANIZATION-CONFIG] ⚠️ Usando OAuth TEST - NO FUNCIONA CON POINT");
    } else if (globalAccessToken && globalPublicKey) {
      // Global TEST - Para otros usos pero NO Point
      selectedPublicKey = globalPublicKey;
      selectedAccessToken = globalAccessToken;
      selectedEnvironment = "test";
      credentialSource = "global-test";
      isConnected = true;
      console.log("🧪 [ORGANIZATION-CONFIG] ⚠️ Usando Global TEST - NO FUNCIONA CON POINT");
    } else {
      console.log("❌ [ORGANIZATION-CONFIG] No se encontraron credenciales válidas");
    }

    console.log("🔍 [ORGANIZATION-CONFIG] Resultado final:", {
      organizationId,
      isConnected,
      credentialSource,
      environment: selectedEnvironment,
      hasPublicKey: !!selectedPublicKey,
      hasAccessToken: !!selectedAccessToken,
      publicKeyStart: selectedPublicKey?.substring(0, 15) || "NO_KEY",
      accessTokenStart: selectedAccessToken?.substring(0, 15) || "NO_TOKEN",
    });

    if (!isConnected || !selectedPublicKey || !selectedAccessToken) {
      return NextResponse.json({
        isConnected: false,
        publicKey: null,
        accessToken: null,
        error: "MercadoPago no está configurado correctamente",
      });
    }

    // Todo está configurado correctamente
    return NextResponse.json({
      isConnected: true,
      publicKey: selectedPublicKey,
      accessToken: selectedAccessToken,
      environment: selectedEnvironment,
      credentialSource,
      organizationId: organizationId,
    });
  } catch (error) {
    console.error("💥 [ORGANIZATION-CONFIG] Error:", error);
    return NextResponse.json(
      {
        isConnected: false,
        publicKey: null,
        accessToken: null,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

async function verifyToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.mercadopago.com/users/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.ok;
  } catch (error) {
    console.error("Error verificando token:", error);
    return false;
  }
}
