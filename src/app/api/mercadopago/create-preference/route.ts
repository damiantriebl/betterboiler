import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

interface CreatePreferenceRequest {
  amount: number;
  description: string;
  motorcycleId?: number;
  saleId?: string;
  additionalInfo?: {
    brand?: string;
    model?: string;
    year?: number;
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

    const body: CreatePreferenceRequest = await request.json();
    const { amount, description, motorcycleId, saleId, additionalInfo } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    }

    console.log("🎯 [CREATE-PREFERENCE] Iniciando para organización:", {
      organizationId: session.user.organizationId,
      amount,
      description,
      motorcycleId,
      saleId,
    });

    // Obtener configuración OAuth de la organización
    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: {
        organizationId: session.user.organizationId,
      },
    });

    console.log("🔍 [CREATE-PREFERENCE] Configuración encontrada:", {
      organizationId: session.user.organizationId,
      configExists: !!oauthConfig,
      hasAccessToken: !!oauthConfig?.accessToken,
      hasPublicKey: !!oauthConfig?.publicKey,
      publicKeyType: typeof oauthConfig?.publicKey,
      accessTokenType: typeof oauthConfig?.accessToken,
      publicKeyLength: oauthConfig?.publicKey?.length || 0,
      accessTokenLength: oauthConfig?.accessToken?.length || 0,
    });

    if (!oauthConfig?.accessToken || !oauthConfig?.publicKey) {
      return NextResponse.json(
        {
          error: "MercadoPago no está configurado para esta organización",
          details: "Debe conectar MercadoPago primero en configuración",
        },
        { status: 400 },
      );
    }

    console.log("🎯 [CREATE-PREFERENCE] Creando preferencia para:", {
      organizationId: session.user.organizationId,
      amount,
      description,
      motorcycleId,
      saleId,
    });

    // Crear preferencia usando el access token de la organización
    const preferenceData = {
      items: [
        {
          title: description,
          unit_price: amount,
          quantity: 1,
          id: motorcycleId ? `motorcycle-${motorcycleId}` : "sale-item",
          description: additionalInfo
            ? `${additionalInfo.brand} ${additionalInfo.model} ${additionalInfo.year}`
            : description,
        },
      ],
      purpose: "wallet_purchase", // Permite pagos con y sin cuenta MP
      back_urls: {
        success: `${process.env.BASE_URL}/sales/success`,
        failure: `${process.env.BASE_URL}/sales/failure`,
        pending: `${process.env.BASE_URL}/sales/pending`,
      },
      auto_return: "approved",
      external_reference: saleId || `sale-${Date.now()}`,
      notification_url: `${process.env.BASE_URL}/api/mercadopago/webhooks`,
      metadata: {
        organization_id: session.user.organizationId,
        motorcycle_id: motorcycleId,
        sale_id: saleId,
      },
    };

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${oauthConfig.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferenceData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ [CREATE-PREFERENCE] Error de MercadoPago:", {
        status: response.status,
        error: errorData,
      });

      return NextResponse.json(
        {
          error: "Error al crear preferencia de pago",
          details: "Error de comunicación con MercadoPago",
        },
        { status: 500 },
      );
    }

    const preference = await response.json();

    console.log("✅ [CREATE-PREFERENCE] Preferencia creada exitosamente:", {
      preferenceId: preference.id,
      publicKey: oauthConfig.publicKey ? "DISPONIBLE" : "NO DISPONIBLE",
    });

    return NextResponse.json({
      success: true,
      preferenceId: preference.id,
      publicKey: oauthConfig.publicKey,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
    });
  } catch (error) {
    console.error("❌ [CREATE-PREFERENCE] Error interno:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
