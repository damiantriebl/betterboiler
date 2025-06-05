import { validateOrganizationAccess } from "@/actions/util";
import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Debug OAuth] Verificando datos OAuth...");

    // Validar acceso a la organización
    const { organizationId, error } = await validateOrganizationAccess();
    if (error || !organizationId) {
      console.error("❌ [Debug OAuth] Error de organización:", error);
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Buscar configuración OAuth
    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: {
        organizationId: organizationId,
      },
    });

    console.log("📊 [Debug OAuth] Configuración encontrada:", {
      exists: !!oauthConfig,
      organizationId,
      hasAccessToken: !!oauthConfig?.accessToken,
      accessTokenStart: oauthConfig?.accessToken?.substring(0, 15),
      refreshToken: !!oauthConfig?.refreshToken,
      email: oauthConfig?.email,
      createdAt: oauthConfig?.createdAt,
    });

    // Verificar también variables de entorno
    const globalAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const globalPublicKey = process.env.MERCADOPAGO_PUBLIC_KEY;

    return NextResponse.json({
      success: true,
      debug: {
        organizationId,
        oauth: {
          exists: !!oauthConfig,
          email: oauthConfig?.email,
          hasAccessToken: !!oauthConfig?.accessToken,
          accessTokenPreview: oauthConfig?.accessToken
            ? `${oauthConfig.accessToken.substring(0, 15)}...`
            : null,
          accessTokenType: oauthConfig?.accessToken?.startsWith("TEST-")
            ? "TEST"
            : oauthConfig?.accessToken?.startsWith("APP_USR-")
              ? "PROD"
              : "UNKNOWN",
          hasRefreshToken: !!oauthConfig?.refreshToken,
          createdAt: oauthConfig?.createdAt?.toISOString(),
          expiresAt: oauthConfig?.expiresAt?.toISOString(),
        },
        globalCredentials: {
          hasGlobalAccessToken: !!globalAccessToken,
          globalAccessTokenPreview: globalAccessToken
            ? `${globalAccessToken.substring(0, 15)}...`
            : null,
          globalAccessTokenType: globalAccessToken?.startsWith("TEST-")
            ? "TEST"
            : globalAccessToken?.startsWith("APP_USR-")
              ? "PROD"
              : "UNKNOWN",
          hasGlobalPublicKey: !!globalPublicKey,
          globalPublicKeyPreview: globalPublicKey ? `${globalPublicKey.substring(0, 15)}...` : null,
        },
      },
    });
  } catch (error) {
    console.error("❌ [Debug OAuth] Error:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
