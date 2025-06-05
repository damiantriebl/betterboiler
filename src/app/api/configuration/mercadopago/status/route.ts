import { validateOrganizationAccess } from "@/actions/util";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    // FIXED: Usar validateOrganizationAccess en lugar de requireOrganizationId para mejor manejo de errores
    const authResult = await validateOrganizationAccess();

    if (!authResult.success || !authResult.organizationId) {
      console.warn("⚠️ [MercadoPago Status] No organization access:", authResult.error);

      // Devolver estado indicando que no está configurado en lugar de error 500
      return NextResponse.json(
        {
          // Credenciales globales
          hasGlobalAccessToken: false,
          hasGlobalPublicKey: false,

          // Credenciales OAuth
          hasOAuthConfig: false,
          hasOAuthAccessToken: false,
          oauthEmail: null,
          oauthUserId: null,

          // Public key info
          hasPublicKey: false,
          publicKey: null,
          isPublicKeyValid: false,

          // Estado general
          environment: "unknown",
          integrationMode: "incomplete",
          isConfigured: false,
          canMakePayments: false,
          canConnectVendors: false,
          organizationConnected: false,

          // Error info
          error: "No hay acceso a organización",
          details: authResult.error || "Usuario no autenticado o sin organización asignada",
        },
        { status: 200 },
      ); // 200 en lugar de 401 para que el frontend pueda mostrar estado
    }

    const organizationId = authResult.organizationId;

    // Verificar credenciales globales de la aplicación (.env)
    const hasGlobalAccessToken = !!process.env.MERCADOPAGO_ACCESS_TOKEN;
    const hasGlobalPublicKey = !!process.env.MERCADOPAGO_PUBLIC_KEY;

    // Verificar credenciales OAuth de esta organización (base de datos)
    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: {
        organizationId: organizationId,
      },
    });

    const hasOAuthConfig = !!oauthConfig;
    const hasOAuthAccessToken = !!oauthConfig?.accessToken;

    // NUEVO: Verificar public key específica de la organización
    const hasOAuthPublicKey = !!oauthConfig?.publicKey;
    const isPublicKeyValid =
      oauthConfig?.publicKey &&
      oauthConfig.publicKey !== "PLACEHOLDER_TOKEN" &&
      (oauthConfig.publicKey.startsWith("TEST-") || oauthConfig.publicKey.startsWith("APP_USR-"));

    // Determinar el entorno basado en las claves
    let environment = "unknown";
    if (hasGlobalAccessToken && process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith("TEST-")) {
      environment = "sandbox";
    } else if (
      hasGlobalAccessToken &&
      process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith("APP_USR-")
    ) {
      environment = "production";
    }

    // Determinar modo de integración
    let integrationMode: "oauth" | "direct" | "incomplete" = "incomplete";

    if (hasGlobalAccessToken && hasGlobalPublicKey) {
      integrationMode = "direct"; // Pagos directos con credenciales globales
    }

    if (hasOAuthConfig && hasOAuthAccessToken) {
      integrationMode = "oauth"; // OAuth configurado para esta organización
    }

    return NextResponse.json({
      // Credenciales globales (aplicación principal)
      hasGlobalAccessToken,
      hasGlobalPublicKey,

      // Credenciales OAuth (específicas de organización)
      hasOAuthConfig,
      hasOAuthAccessToken,
      oauthEmail: oauthConfig?.email || null,
      oauthUserId: oauthConfig?.mercadoPagoUserId || null,

      // NUEVO: Información sobre public key de la organización
      hasPublicKey: hasOAuthPublicKey,
      publicKey: oauthConfig?.publicKey || null,
      isPublicKeyValid,

      // Estado general
      environment,
      integrationMode,
      isConfigured: hasGlobalAccessToken && hasGlobalPublicKey,
      canMakePayments: hasGlobalAccessToken && hasGlobalPublicKey,
      canConnectVendors: hasGlobalAccessToken && hasGlobalPublicKey, // Necesitas credenciales globales para OAuth
      organizationConnected: hasOAuthConfig && hasOAuthAccessToken,
    });
  } catch (error) {
    console.error("Error verificando estado de configuración:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

async function verifyMercadoPagoToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.mercadopago.com/users/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.ok;
  } catch (error) {
    console.error("Error verificando token de Mercado Pago:", error);
    return false;
  }
}
