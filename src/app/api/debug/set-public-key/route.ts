import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { publicKey } = await request.json();

    if (!publicKey || typeof publicKey !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Public key es requerida",
        },
        { status: 400 },
      );
    }

    // Validar formato básico de public key
    if (!publicKey.match(/^(TEST-|APP_USR-|PROD-)[a-zA-Z0-9_-]+$/)) {
      return NextResponse.json(
        {
          success: false,
          error: "Formato de public key inválido",
        },
        { status: 400 },
      );
    }

    console.log("🔧 [SET-PUBLIC-KEY] Configurando public key:", {
      publicKeyPrefix: `${publicKey.substring(0, 20)}...`,
      isTest: publicKey.includes("TEST"),
      isProduction: publicKey.startsWith("APP_USR"),
    });

    // Obtener la configuración OAuth existente
    const oauthConfig = await prisma.mercadoPagoOAuth.findFirst();

    if (!oauthConfig) {
      return NextResponse.json(
        {
          success: false,
          error: "No se encontró configuración OAuth de MercadoPago",
        },
        { status: 404 },
      );
    }

    // Actualizar con la public key
    await prisma.mercadoPagoOAuth.update({
      where: { organizationId: oauthConfig.organizationId },
      data: {
        publicKey,
        updatedAt: new Date(),
      },
    });

    console.log("✅ [SET-PUBLIC-KEY] Public key configurada exitosamente");

    return NextResponse.json({
      success: true,
      message: "Public key configurada exitosamente",
      publicKey: `${publicKey.substring(0, 20)}...`,
      organizationId: oauthConfig.organizationId,
      isTest: publicKey.includes("TEST"),
      isProduction: publicKey.startsWith("APP_USR"),
    });
  } catch (error) {
    console.error("💥 [SET-PUBLIC-KEY] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error configurando public key",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
