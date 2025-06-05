import { validateOrganizationAccess } from "@/actions/util";
import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 [Refresh Token] Renovando access token...");

    // Validar acceso a la organización
    const { organizationId, error } = await validateOrganizationAccess();
    if (error || !organizationId) {
      console.error("❌ [Refresh Token] Error de organización:", error);
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Buscar configuración OAuth
    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: {
        organizationId: organizationId,
      },
    });

    if (!oauthConfig) {
      return NextResponse.json(
        {
          error: "No hay configuración OAuth para esta organización",
        },
        { status: 404 },
      );
    }

    if (!oauthConfig.refreshToken) {
      return NextResponse.json(
        {
          error: "No hay refresh token disponible",
        },
        { status: 400 },
      );
    }

    // Renovar el access token
    const tokenData = {
      grant_type: "refresh_token",
      client_id: process.env.MERCADOPAGO_CLIENT_ID,
      client_secret: process.env.MERCADOPAGO_CLIENT_SECRET,
      refresh_token: oauthConfig.refreshToken,
    };

    console.log("🔑 [Refresh Token] Solicitando nuevo token a MercadoPago...");

    const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tokenData),
    });

    const tokenResult = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("❌ [Refresh Token] Error de MercadoPago:", tokenResult);
      return NextResponse.json(
        {
          error: "Error renovando token",
          details: tokenResult.message || "Error desconocido",
          mercadopago_error: tokenResult,
        },
        { status: tokenResponse.status },
      );
    }

    console.log("✅ [Refresh Token] Token renovado exitosamente");

    // Actualizar en la base de datos
    const updatedConfig = await prisma.mercadoPagoOAuth.update({
      where: {
        organizationId: organizationId,
      },
      data: {
        accessToken: tokenResult.access_token,
        refreshToken: tokenResult.refresh_token || oauthConfig.refreshToken,
        expiresAt: tokenResult.expires_in
          ? new Date(Date.now() + tokenResult.expires_in * 1000)
          : null,
        scopes: tokenResult.scope ? tokenResult.scope.split(" ") : oauthConfig.scopes,
      },
    });

    // También intentar obtener y actualizar la public key
    try {
      const credentialsResponse = await fetch("https://api.mercadopago.com/users/me", {
        headers: {
          Authorization: `Bearer ${tokenResult.access_token}`,
        },
      });

      if (credentialsResponse.ok) {
        const credentialsData = await credentialsResponse.json();
        const publicKey = credentialsData.public_key;

        if (publicKey) {
          await prisma.mercadoPagoOAuth.update({
            where: {
              organizationId: organizationId,
            },
            data: {
              publicKey: publicKey,
            },
          });
          console.log("🔑 [Refresh Token] Public key también actualizada");
        }
      }
    } catch (error) {
      console.warn("⚠️ [Refresh Token] No se pudo actualizar public key:", error);
    }

    return NextResponse.json({
      success: true,
      message: "Access token renovado exitosamente",
      data: {
        accessTokenPreview: `${tokenResult.access_token.substring(0, 15)}...`,
        accessTokenType: tokenResult.access_token.startsWith("TEST-") ? "TEST" : "PROD",
        expiresAt: updatedConfig.expiresAt?.toISOString(),
        scopes: updatedConfig.scopes,
        hasPublicKey: !!updatedConfig.publicKey,
      },
    });
  } catch (error) {
    console.error("❌ [Refresh Token] Error interno:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
