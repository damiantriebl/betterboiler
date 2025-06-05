import { requireOrganizationId } from "@/actions/util";
import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Obtener organizationId de la sesión
    const organizationId = await requireOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    console.log("💳 [MERCADOPAGO-PREFERENCE] === CREANDO PREFERENCIA ===");
    console.log("💳 [MERCADOPAGO-PREFERENCE] Organización:", organizationId);

    // Obtener configuración de MercadoPago para esta organización
    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: {
        organizationId: organizationId,
      },
    });

    // Determinar qué credenciales usar (sin hardcodear)
    let accessToken = null;
    let credentialSource = "none";

    // Verificar credenciales globales
    const globalAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const globalIsTest = globalAccessToken?.startsWith("TEST-");

    // Verificar credenciales OAuth
    const oauthAccessToken = oauthConfig?.accessToken;
    const oauthIsTest = oauthAccessToken?.startsWith("TEST-");

    // LÓGICA DE PRIORIDAD: OAuth primero, luego global
    if (oauthAccessToken) {
      accessToken = oauthAccessToken;
      credentialSource = oauthIsTest ? "oauth-test" : "oauth-prod";
      console.log(
        `🔑 [MERCADOPAGO-PREFERENCE] Usando credenciales OAuth ${oauthIsTest ? "TEST" : "PRODUCCIÓN"}`,
      );
    } else if (globalAccessToken) {
      accessToken = globalAccessToken;
      credentialSource = globalIsTest ? "global-test" : "global-prod";
      console.log(
        `🔑 [MERCADOPAGO-PREFERENCE] Usando credenciales globales ${globalIsTest ? "TEST" : "PRODUCCIÓN"}`,
      );
    }

    if (!accessToken) {
      console.error("❌ [MERCADOPAGO-PREFERENCE] No se encontraron credenciales válidas");
      return NextResponse.json(
        {
          error:
            "Mercado Pago no configurado - Configura credenciales OAuth o variables de entorno",
        },
        { status: 400 },
      );
    }

    // Parsear el cuerpo de la solicitud
    const body = await request.json();
    const {
      transaction_amount,
      currency_id = "ARS",
      description,
      payer,
      external_reference,
    } = body;

    console.log("📋 [MERCADOPAGO-PREFERENCE] Datos recibidos:", {
      amount: transaction_amount,
      description,
      payer_email: payer?.email,
    });

    // Validar datos requeridos
    if (!transaction_amount || !description || !payer?.email) {
      return NextResponse.json(
        { error: "Faltan datos requeridos: transaction_amount, description, payer.email" },
        { status: 400 },
      );
    }

    // Configurar URLs dinámicamente (sin hardcodear)
    const baseUrl = (
      process.env.BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3001"
    ).replace(/\/$/, "");

    console.log("🌐 [MERCADOPAGO-PREFERENCE] Base URL configurada:", baseUrl);

    const preferenceData = {
      items: [
        {
          title: description,
          quantity: 1,
          unit_price: Number(transaction_amount),
          currency_id,
        },
      ],
      payer: {
        email: payer.email,
        name: payer.first_name || "",
        surname: payer.last_name || "",
        identification: payer.identification || undefined,
      },
      external_reference: external_reference || `org-${organizationId}-pref-${Date.now()}`,
      back_urls: {
        success: `${baseUrl}/payments/success`,
        failure: `${baseUrl}/payments/failure`,
        pending: `${baseUrl}/payments/pending`,
      },
      // Configurar notificaciones dinámicamente
      notification_url: `${baseUrl}/api/webhooks/mercadopago/${organizationId}`,
      // Añadir metadata de la organización
      metadata: {
        organization_id: organizationId,
        credential_source: credentialSource,
        created_via: "preference_api",
      },
      // Configuración adicional para mejor experiencia
      statement_descriptor: "BETTER-MOTOS",
      expires: false,
      auto_return: "approved",
    };

    console.log(
      "📤 [MERCADOPAGO-PREFERENCE] Enviando preference a Mercado Pago:",
      JSON.stringify(preferenceData, null, 2),
    );

    // Llamar a la API de Mercado Pago para crear la preference
    const mercadoPagoResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferenceData),
    });

    const responseData = await mercadoPagoResponse.json();

    console.log("📥 [MERCADOPAGO-PREFERENCE] Respuesta de MercadoPago:", {
      status: mercadoPagoResponse.status,
      ok: mercadoPagoResponse.ok,
      preferenceId: responseData.id,
    });

    if (!mercadoPagoResponse.ok) {
      console.error("❌ [MERCADOPAGO-PREFERENCE] Error de Mercado Pago:", responseData);
      return NextResponse.json(
        {
          error: "Error al crear la preferencia de pago",
          details: responseData,
          debug_info: {
            credential_source: credentialSource,
            organization_id: organizationId,
          },
        },
        { status: mercadoPagoResponse.status },
      );
    }

    console.log("✅ [MERCADOPAGO-PREFERENCE] Preferencia creada exitosamente:", responseData.id);

    // Retornar la respuesta con la URL de checkout
    return NextResponse.json({
      success: true,
      preference_id: responseData.id,
      init_point: responseData.init_point, // URL para redirigir al usuario
      sandbox_init_point: responseData.sandbox_init_point,
      debug_info: {
        credential_source: credentialSource,
        is_test: accessToken.startsWith("TEST-"),
        organization_id: organizationId,
      },
    });
  } catch (error) {
    console.error("💥 [MERCADOPAGO-PREFERENCE] Error en endpoint de Mercado Pago:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

// Endpoint para obtener métodos de pago disponibles
export async function GET(request: NextRequest) {
  try {
    const organizationId = await requireOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    console.log("🔍 [MERCADOPAGO-METHODS] === OBTENIENDO MÉTODOS DE PAGO ===");
    console.log("🔍 [MERCADOPAGO-METHODS] Organización:", organizationId);

    // Obtener configuración de MercadoPago para esta organización
    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: {
        organizationId: organizationId,
      },
    });

    // Determinar qué credenciales usar (sin hardcodear)
    let accessToken = null;
    let credentialSource = "none";

    // Verificar credenciales OAuth primero
    const oauthAccessToken = oauthConfig?.accessToken;
    const oauthIsTest = oauthAccessToken?.startsWith("TEST-");

    // Verificar credenciales globales como fallback
    const globalAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const globalIsTest = globalAccessToken?.startsWith("TEST-");

    if (oauthAccessToken) {
      accessToken = oauthAccessToken;
      credentialSource = oauthIsTest ? "oauth-test" : "oauth-prod";
      console.log(
        `🔑 [MERCADOPAGO-METHODS] Usando credenciales OAuth ${oauthIsTest ? "TEST" : "PRODUCCIÓN"}`,
      );
    } else if (globalAccessToken) {
      accessToken = globalAccessToken;
      credentialSource = globalIsTest ? "global-test" : "global-prod";
      console.log(
        `🔑 [MERCADOPAGO-METHODS] Usando credenciales globales ${globalIsTest ? "TEST" : "PRODUCCIÓN"}`,
      );
    }

    if (!accessToken) {
      console.error("❌ [MERCADOPAGO-METHODS] No se encontraron credenciales válidas");
      return NextResponse.json(
        {
          error:
            "Mercado Pago no configurado - Configura credenciales OAuth o variables de entorno",
        },
        { status: 400 },
      );
    }

    // Obtener métodos de pago disponibles desde Mercado Pago
    const response = await fetch("https://api.mercadopago.com/v1/payment_methods", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error("❌ [MERCADOPAGO-METHODS] Error obteniendo métodos de pago");
      return NextResponse.json(
        { error: "Error al obtener métodos de pago" },
        { status: response.status },
      );
    }

    const paymentMethods = await response.json();

    console.log("✅ [MERCADOPAGO-METHODS] Métodos de pago obtenidos:", paymentMethods.length);

    return NextResponse.json({
      success: true,
      payment_methods: paymentMethods,
      debug_info: {
        credential_source: credentialSource,
        is_test: accessToken.startsWith("TEST-"),
        organization_id: organizationId,
        methods_count: paymentMethods.length,
      },
    });
  } catch (error) {
    console.error("💥 [MERCADOPAGO-METHODS] Error obteniendo métodos de pago:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
