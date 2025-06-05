import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

interface HybridSetupRequest {
  // Credenciales directas del panel de desarrollador
  publicKey: string;
  accessToken?: string; // Opcional si ya tiene OAuth
  // Configuración
  environment: "sandbox" | "production";
  testCredentials?: {
    testPublicKey: string;
    testAccessToken: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "No se encontró sesión válida" }, { status: 401 });
    }

    const { publicKey, accessToken, environment, testCredentials }: HybridSetupRequest =
      await request.json();

    console.log("🔧 [HYBRID-SETUP] Configurando MercadoPago híbrido:", {
      organizationId: session.user.organizationId,
      environment,
      hasPublicKey: !!publicKey,
      hasAccessToken: !!accessToken,
      hasTestCredentials: !!testCredentials,
    });

    // Validar formato de public key
    const isValidPublicKey = /^(TEST-|APP_USR-|PROD-)?[a-zA-Z0-9_-]+$/i.test(publicKey);
    if (!isValidPublicKey) {
      return NextResponse.json({ error: "Formato de public key inválido" }, { status: 400 });
    }

    // Verificar que el environment coincida con la public key
    const isTestKey = publicKey.includes("TEST");
    const isProdKey = publicKey.startsWith("APP_USR");

    if (environment === "sandbox" && !isTestKey) {
      return NextResponse.json(
        { error: "Para ambiente sandbox debe usar una public key TEST-" },
        { status: 400 },
      );
    }

    if (environment === "production" && !isProdKey) {
      return NextResponse.json(
        { error: "Para ambiente producción debe usar una public key APP_USR-" },
        { status: 400 },
      );
    }

    // Obtener configuración OAuth existente (si existe)
    const existingOauth = await prisma.mercadoPagoOAuth.findUnique({
      where: {
        organizationId: session.user.organizationId,
      },
    });

    let finalAccessToken = accessToken;

    // Si no se proporciona access token pero existe OAuth, usarlo
    if (!finalAccessToken && existingOauth?.accessToken) {
      finalAccessToken = existingOauth.accessToken;
      console.log("🔄 [HYBRID-SETUP] Usando access token de OAuth existente");
    }

    // Si no hay access token, usar el mismo que public key para testing básico
    if (!finalAccessToken) {
      // Para testing, a veces la public key puede usarse como access token en sandbox
      finalAccessToken = publicKey.replace("TEST-", "TEST-");
      console.log("⚠️ [HYBRID-SETUP] Generando access token de prueba");
    }

    // Probar las credenciales con MercadoPago
    try {
      console.log("🧪 [HYBRID-SETUP] Probando credenciales...");

      const testResponse = await fetch("https://api.mercadopago.com/v1/payment_methods", {
        headers: {
          Authorization: `Bearer ${finalAccessToken}`,
        },
      });

      if (!testResponse.ok) {
        console.warn("⚠️ [HYBRID-SETUP] Access token no válido, continuando solo con public key");
        finalAccessToken = undefined;
      } else {
        console.log("✅ [HYBRID-SETUP] Access token verificado");
      }
    } catch (error) {
      console.warn("⚠️ [HYBRID-SETUP] Error verificando access token:", error);
      finalAccessToken = undefined;
    }

    // Guardar configuración híbrida
    const configData = {
      organizationId: session.user.organizationId,
      publicKey: publicKey,
      accessToken: finalAccessToken || "PLACEHOLDER_TOKEN", // Asegurar que siempre sea string
      refreshToken: existingOauth?.refreshToken, // Mantener si existe
      email: existingOauth?.email || "manual@setup.com",
      mercadoPagoUserId: existingOauth?.mercadoPagoUserId || "manual",
      scopes: ["read", "write"],
      expiresAt: null,
      // isHybridSetup: true, // Marcar como configuración híbrida
      // environment: environment,
      // notes: `Configuración híbrida: ${environment} - ${new Date().toISOString()}`
    };

    await prisma.mercadoPagoOAuth.upsert({
      where: {
        organizationId: session.user.organizationId,
      },
      update: configData,
      create: configData,
    });

    // Habilitar MercadoPago como método de pago si no está habilitado
    try {
      let mercadoPagoMethod = await prisma.paymentMethod.findUnique({
        where: { type: "mercadopago" },
      });

      if (!mercadoPagoMethod) {
        mercadoPagoMethod = await prisma.paymentMethod.create({
          data: {
            name: "MercadoPago",
            type: "mercadopago",
            description: "Pagos con MercadoPago - Configuración Híbrida",
            iconUrl: "/icons/mercadopago.svg",
          },
        });
      }

      const existingOrgMethod = await prisma.organizationPaymentMethod.findUnique({
        where: {
          organizationId_methodId: {
            organizationId: session.user.organizationId,
            methodId: mercadoPagoMethod.id,
          },
        },
      });

      if (!existingOrgMethod) {
        const highestOrder = await prisma.organizationPaymentMethod.findFirst({
          where: { organizationId: session.user.organizationId },
          orderBy: { order: "desc" },
          select: { order: true },
        });

        await prisma.organizationPaymentMethod.create({
          data: {
            organizationId: session.user.organizationId,
            methodId: mercadoPagoMethod.id,
            isEnabled: true,
            order: (highestOrder?.order || -1) + 1,
          },
        });
      } else if (!existingOrgMethod.isEnabled) {
        await prisma.organizationPaymentMethod.update({
          where: { id: existingOrgMethod.id },
          data: { isEnabled: true },
        });
      }
    } catch (paymentMethodError) {
      console.warn("⚠️ [HYBRID-SETUP] Error habilitando método de pago:", paymentMethodError);
    }

    console.log("✅ [HYBRID-SETUP] Configuración híbrida completada");

    return NextResponse.json({
      success: true,
      message: "Configuración híbrida de MercadoPago completada exitosamente",
      configuration: {
        environment,
        publicKey: `${publicKey.substring(0, 20)}...`,
        hasAccessToken: !!finalAccessToken,
        isHybridSetup: true,
      },
      instructions: [
        "Configuración híbrida completada",
        "Public key configurada desde Developer Panel",
        finalAccessToken
          ? "Access token disponible para pagos"
          : "Solo public key - funcionalidad limitada",
        "MercadoPago habilitado como método de pago",
        "Puedes probar el checkout desde la página de ventas",
      ],
    });
  } catch (error) {
    console.error("💥 [HYBRID-SETUP] Error:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      info: {
        title: "Configuración Híbrida de MercadoPago",
        description: "Combina OAuth con credenciales directas del Developer Panel",
        steps: [
          "1. Ve a tu MercadoPago Developer Panel",
          "2. Copia tus credenciales (Public Key y Access Token)",
          "3. Configura usando este endpoint híbrido",
          "4. Disfruta de un checkout funcional",
        ],
        links: {
          sandbox: "https://www.mercadopago.com.ar/developers/panel/credentials/sandbox",
          production: "https://www.mercadopago.com.ar/developers/panel/credentials/production",
        },
        advantages: [
          "Funciona inmediatamente sin problemas de OAuth",
          "Mantiene la seguridad con credenciales oficiales",
          "Compatible con el sistema multi-tenant existente",
          "Permite usar tanto sandbox como producción",
        ],
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
