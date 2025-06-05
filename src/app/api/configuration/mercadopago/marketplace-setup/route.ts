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

    console.log(
      "🏪 [MARKETPLACE] Configurando modo marketplace para:",
      session.user.organizationId,
    );

    // Usar credenciales globales de la aplicación (configuradas en env)
    const MASTER_PUBLIC_KEY = process.env.MERCADOPAGO_MASTER_PUBLIC_KEY;
    const MASTER_ACCESS_TOKEN = process.env.MERCADOPAGO_MASTER_ACCESS_TOKEN;
    const MASTER_CLIENT_ID = process.env.MERCADOPAGO_CLIENT_ID;

    if (!MASTER_PUBLIC_KEY || !MASTER_ACCESS_TOKEN) {
      return NextResponse.json(
        {
          error: "Configuración marketplace incompleta",
          details:
            "Se requieren MERCADOPAGO_MASTER_PUBLIC_KEY y MERCADOPAGO_MASTER_ACCESS_TOKEN en variables de entorno",
        },
        { status: 500 },
      );
    }

    // Verificar que las credenciales master funcionen
    try {
      const testResponse = await fetch("https://api.mercadopago.com/v1/payment_methods", {
        headers: {
          Authorization: `Bearer ${MASTER_ACCESS_TOKEN}`,
        },
      });

      if (!testResponse.ok) {
        return NextResponse.json({ error: "Credenciales master no válidas" }, { status: 400 });
      }

      console.log("✅ [MARKETPLACE] Credenciales master verificadas");
    } catch (error) {
      return NextResponse.json({ error: "Error verificando credenciales master" }, { status: 400 });
    }

    // Obtener información de la organización
    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    // Crear configuración marketplace para esta organización
    const marketplaceConfig = {
      organizationId: session.user.organizationId,
      publicKey: MASTER_PUBLIC_KEY,
      accessToken: MASTER_ACCESS_TOKEN,
      refreshToken: null,
      email: "marketplace@app.com",
      mercadoPagoUserId: "marketplace_mode",
      scopes: ["read", "write", "offline_access"],
      expiresAt: null,
      // Datos específicos del marketplace
      // isMarketplaceMode: true,
      // organizationName: organization.name,
      // organizationEmail: 'marketplace@app.com',
    };

    await prisma.mercadoPagoOAuth.upsert({
      where: {
        organizationId: session.user.organizationId,
      },
      update: marketplaceConfig,
      create: marketplaceConfig,
    });

    // Habilitar MercadoPago como método de pago automáticamente
    try {
      let mercadoPagoMethod = await prisma.paymentMethod.findUnique({
        where: { type: "mercadopago" },
      });

      if (!mercadoPagoMethod) {
        mercadoPagoMethod = await prisma.paymentMethod.create({
          data: {
            name: "MercadoPago",
            type: "mercadopago",
            description: "Pagos con MercadoPago - Modo Marketplace",
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
      console.warn("⚠️ [MARKETPLACE] Error habilitando método de pago:", paymentMethodError);
    }

    console.log("✅ [MARKETPLACE] Configuración marketplace completada");

    return NextResponse.json({
      success: true,
      message: "MercadoPago configurado en modo marketplace",
      mode: "MARKETPLACE",
      configuration: {
        publicKey: `${MASTER_PUBLIC_KEY.substring(0, 20)}...`,
        hasAccessToken: true,
        isMarketplaceMode: true,
        organizationName: organization.name,
      },
      benefits: [
        "✅ Configuración automática sin intervención del cliente",
        "✅ Una sola cuenta MercadoPago maneja todos los pagos",
        "✅ Los pagos se procesan inmediatamente",
        "✅ Puedes distribuir comisiones automáticamente",
        "✅ Experiencia de usuario perfecta",
      ],
      howItWorks: [
        "1. Tu aplicación recibe todos los pagos con tu cuenta MercadoPago",
        "2. Los clientes pagan normalmente con el brick",
        "3. Tú recibes el dinero y después distribuyes a los vendedores",
        "4. Puedes descontar comisiones automáticamente",
      ],
    });
  } catch (error) {
    console.error("💥 [MARKETPLACE] Error:", error);
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
        title: "Modo Marketplace de MercadoPago",
        description: "Configuración automática usando una cuenta principal para todos los clientes",
        advantages: [
          "Sin configuración manual por cliente",
          "Experiencia de usuario perfecta",
          "Una sola integración para toda la plataforma",
          "Control total sobre comisiones y distribución",
          "Menos problemas técnicos",
        ],
        requirements: [
          "MERCADOPAGO_MASTER_PUBLIC_KEY en variables de entorno",
          "MERCADOPAGO_MASTER_ACCESS_TOKEN en variables de entorno",
          "Cuenta MercadoPago de la aplicación configurada",
        ],
        considerations: [
          "Los pagos llegan a tu cuenta principal",
          "Debes distribuir manualmente a los vendedores",
          "Puedes automatizar comisiones y splits",
          "Mejor control sobre el flujo de dinero",
        ],
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
