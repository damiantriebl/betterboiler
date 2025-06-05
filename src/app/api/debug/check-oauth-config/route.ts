import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Obtener TODAS las configuraciones OAuth
    const allOAuthConfigs = await prisma.mercadoPagoOAuth.findMany({
      select: {
        organizationId: true,
        email: true,
        accessToken: true,
        publicKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Mapear datos para debug (ocultando tokens completos)
    const configSummary = allOAuthConfigs.map((config) => ({
      organizationId: config.organizationId,
      email: config.email,
      hasAccessToken: !!config.accessToken,
      hasPublicKey: !!config.publicKey,
      accessTokenStart: config.accessToken?.substring(0, 15) || "NO_TOKEN",
      publicKeyStart: config.publicKey?.substring(0, 15) || "NO_KEY",
      isTestToken: config.accessToken?.startsWith("TEST-") || false,
      isTestKey: config.publicKey?.startsWith("TEST-") || false,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }));

    // También verificar variables globales
    const globalInfo = {
      hasGlobalAccessToken: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
      hasGlobalPublicKey: !!process.env.MERCADOPAGO_PUBLIC_KEY,
      globalAccessTokenStart: process.env.MERCADOPAGO_ACCESS_TOKEN?.substring(0, 15) || "NO_TOKEN",
      globalPublicKeyStart: process.env.MERCADOPAGO_PUBLIC_KEY?.substring(0, 15) || "NO_KEY",
      globalIsTest: process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith("TEST-") || false,
    };

    return NextResponse.json({
      success: true,
      totalOAuthConfigs: allOAuthConfigs.length,
      oauthConfigs: configSummary,
      globalConfig: globalInfo,
      recommendation: allOAuthConfigs.length === 0 
        ? "❌ No hay configuraciones OAuth. La organización necesita conectarse via OAuth."
        : "✅ Hay configuraciones OAuth disponibles.",
    });
  } catch (error) {
    console.error("❌ [CHECK-OAUTH] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error consultando configuraciones OAuth",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
} 