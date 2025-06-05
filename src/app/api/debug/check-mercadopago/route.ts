import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [CHECK-MP] Verificando configuración de MercadoPago...");

    // Obtener todas las configuraciones de MercadoPago
    const allConfigs = await prisma.mercadoPagoOAuth.findMany({
      select: {
        organizationId: true,
        accessToken: true,
        publicKey: true,
        email: true,
        scopes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log("📊 [CHECK-MP] Configuraciones encontradas:", allConfigs.length);

    const configSummary = allConfigs.map((config) => ({
      organizationId: config.organizationId,
      hasAccessToken: !!config.accessToken,
      hasPublicKey: !!config.publicKey,
      publicKeyPrefix: config.publicKey ? `${config.publicKey.substring(0, 20)}...` : null,
      email: config.email,
      scopes: config.scopes,
      isTest: config.publicKey?.includes("TEST") || false,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }));

    // También verificar métodos de pago habilitados
    const mercadoPagoMethod = await prisma.paymentMethod.findUnique({
      where: { type: "mercadopago" },
    });

    let enabledOrganizations: Array<{
      organizationId: string;
      isEnabled: boolean;
      order: number;
    }> = [];

    if (mercadoPagoMethod) {
      const paymentMethods = await prisma.organizationPaymentMethod.findMany({
        where: {
          methodId: mercadoPagoMethod.id,
        },
        select: {
          organizationId: true,
          isEnabled: true,
          order: true,
        },
      });
      enabledOrganizations = paymentMethods;
    }

    return NextResponse.json({
      success: true,
      totalConfigurations: allConfigs.length,
      configurations: configSummary,
      enabledOrganizations,
      mercadoPagoMethodExists: !!mercadoPagoMethod,
      mercadoPagoMethodId: mercadoPagoMethod?.id,
      summary: {
        withAccessToken: allConfigs.filter((c) => c.accessToken).length,
        withPublicKey: allConfigs.filter((c) => c.publicKey).length,
        complete: allConfigs.filter((c) => c.accessToken && c.publicKey).length,
      },
    });
  } catch (error) {
    console.error("💥 [CHECK-MP] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error checking configuration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
