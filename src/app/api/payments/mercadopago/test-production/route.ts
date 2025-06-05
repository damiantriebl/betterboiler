import { requireOrganizationId } from "@/actions/util";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const organizationId = await requireOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    console.log("🏭 [TEST-PRODUCTION] === INICIO TEST PRODUCCIÓN (MIGRADO A ORDERS) ===");
    console.log("🏭 [TEST-PRODUCTION] Organización:", organizationId);

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token de Mercado Pago no configurado" },
        { status: 400 },
      );
    }

    // VERIFICAR QUE SEA PRODUCCIÓN
    if (!accessToken.startsWith("APP_USR-")) {
      return NextResponse.json(
        {
          error: "Este endpoint solo funciona con credenciales de PRODUCCIÓN (APP_USR-)",
          current_token: accessToken.startsWith("TEST-") ? "TEST (sandbox)" : "DESCONOCIDO",
          required: "APP_USR- (producción)",
          help: "Configura credenciales de producción en tu .env.local",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    console.log("🏭 [TEST-PRODUCTION] Creando order de prueba con credenciales de PRODUCCIÓN...");
    console.log("⚠️ [TEST-PRODUCTION] ADVERTENCIA: Este será un pago REAL con dinero real");

    // 🔍 FUNCIÓN HELPER: Determinar tipo de tarjeta
    const getCardType = (paymentMethodId: string): string => {
      const creditCards = ["visa", "master", "amex", "diners", "hipercard", "elo"];
      const debitCards = ["debvisa", "debmaster", "debelo"];

      if (creditCards.includes(paymentMethodId)) return "credit_card";
      if (debitCards.includes(paymentMethodId)) return "debit_card";
      return "credit_card"; // Default
    };

    // 🆕 NUEVA ESTRUCTURA PARA API DE ORDERS - PRODUCCIÓN
    const orderData = {
      // ✅ CAMPOS REQUERIDOS según documentación
      type: "online",
      external_reference: `prod-test-${organizationId}-${Date.now()}`,
      total_amount: (body.transaction_amount || 1).toString(), // Mínimo para producción
      processing_mode: "automatic",

      // ✅ INFORMACIÓN DEL PAGADOR para PRODUCCIÓN
      payer: {
        email: body.payer?.email || "production.test@better.com", // Email real para producción
        entity_type: "individual",
        first_name: body.payer?.first_name || "Test",
        last_name: body.payer?.last_name || "Production",
        identification: body.payer?.identification || {
          type: "DNI",
          number: "12345678",
        },
        phone: {
          area_code: "11",
          number: "12345678",
        },
        address: {
          zip_code: "1043",
          street_name: "Av. Corrientes",
          street_number: "1234",
          neighborhood: "Centro",
          city: "Buenos Aires",
          state: "Buenos Aires",
          complement: "",
        },
      },

      // ✅ TRANSACCIONES para PRODUCCIÓN
      transactions: {
        payments: [
          {
            amount: (body.transaction_amount || 1).toString(),
            payment_method: {
              id: body.payment_method_id || "visa",
              type: getCardType(body.payment_method_id || "visa"),
              token: body.token, // Token REAL para producción
              installments: body.installments || 1,
              statement_descriptor: "BETTER-PROD-TEST",
            },
          },
        ],
      },

      // ✅ CAMPOS OPCIONALES
      description: body.description || "Test de Better Motos - Producción (Orders API)",
      capture_mode: "automatic_async",
      marketplace: "NONE",

      // ✅ ITEMS para PRODUCCIÓN
      items: [
        {
          title: "Test Producción",
          unit_price: (body.transaction_amount || 1).toString(),
          quantity: 1,
          description: "Item de prueba para testing de producción - Orders API",
          external_code: `prod-test-${Date.now()}`,
          category_id: "others",
          type: "digital",
          warranty: false,
        },
      ],

      // ✅ DATOS DE INTEGRACIÓN para PRODUCCIÓN
      integration_data: {
        integrator_id: "better-production",
        platform_id: "better-platform",
        sponsor: {
          id: organizationId,
        },
      },
    };

    console.log(
      "🏭 [TEST-PRODUCTION] Order Data para PRODUCCIÓN:",
      JSON.stringify(orderData, null, 2),
    );

    // 🆕 NUEVO ENDPOINT: /v1/orders (en lugar de /v1/payments)
    const response = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `prod-test-${organizationId}-${Date.now()}`,
      },
      body: JSON.stringify(orderData),
    });

    const responseData = await response.json();

    console.log("📋 [TEST-PRODUCTION] Respuesta de MercadoPago PRODUCCIÓN:", {
      status: response.status,
      ok: response.ok,
      orderId: responseData.id,
      status_detail: responseData.status_detail,
    });

    if (response.ok) {
      const payment = responseData.transactions?.payments?.[0];

      console.log("✅ [TEST-PRODUCTION] Order de producción procesada:", responseData.id);
      console.log("⚠️ [TEST-PRODUCTION] ATENCIÓN: Este fue un pago REAL con dinero real");

      return NextResponse.json({
        success: true,
        warning: "⚠️ ESTE FUE UN PAGO REAL CON DINERO REAL",
        environment: "PRODUCTION",
        order: {
          id: responseData.id,
          status: responseData.status,
          status_detail: responseData.status_detail,
          total_amount: responseData.total_amount,
          processing_mode: responseData.processing_mode,
          external_reference: responseData.external_reference,
        },
        payment: payment
          ? {
              id: payment.id,
              status: payment.status,
              status_detail: payment.status_detail,
              amount: payment.amount,
              currency: "ARS",
              description: responseData.description,
              created_at: responseData.created_date,
              external_reference: responseData.external_reference,
            }
          : null,
        production_info: {
          api_version: "Orders API v1",
          environment: "production",
          real_money: true,
          organization_id: organizationId,
          access_token_type: "APP_USR (producción)",
          warning: "💰 Dinero real fue procesado en esta transacción",
        },
      });
    }
    console.error("❌ [TEST-PRODUCTION] Error en producción:", responseData);

    return NextResponse.json(
      {
        error: "Error al crear order en producción",
        details: responseData.message || "Error desconocido",
        mercadopago_error: responseData,
        environment: "PRODUCTION",
        debug_info: {
          access_token_prefix: `${accessToken.substring(0, 15)}...`,
          request_data: orderData,
          api_version: "Orders API v1",
          real_money_attempted: true,
        },
      },
      { status: response.status },
    );
  } catch (error) {
    console.error("💥 [TEST-PRODUCTION] Error crítico en producción:", error);
    return NextResponse.json(
      {
        error: "Error crítico en test de producción",
        details: error instanceof Error ? error.message : "Error desconocido",
        environment: "PRODUCTION",
        warning: "Error en entorno de producción con dinero real",
      },
      { status: 500 },
    );
  }
}
