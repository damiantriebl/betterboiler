import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

interface ProcessPaymentRequest {
  token?: string;
  payment_method_id: string;
  installments: number;
  issuer_id?: string;
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    identification?: {
      type: string;
      number: string;
    };
    phone?: {
      area_code: string;
      number: string;
    };
    address?: {
      street_name: string;
      street_number: number;
      zip_code: string;
    };
  };
  amount: number;
  description: string;
  external_reference?: string;
  metadata?: {
    motorcycle_id?: string;
    sale_id?: string;
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

    const body: ProcessPaymentRequest = await request.json();

    console.log("💳 [PROCESS-PAYMENT] === INICIO DE PROCESAMIENTO ===");
    console.log(
      "💳 [PROCESS-PAYMENT] Datos recibidos del frontend:",
      JSON.stringify(body, null, 2),
    );
    console.log("💳 [PROCESS-PAYMENT] Organización:", session.user.organizationId);

    // Obtener configuración OAuth de la organización
    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: {
        organizationId: session.user.organizationId,
      },
    });

    console.log("💳 [PROCESS-PAYMENT] OAuth Config encontrada:", !!oauthConfig);

    // Determinar qué credenciales usar
    let accessToken = null;
    let credentialSource = "none";

    // Verificar credenciales globales
    const globalAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const globalIsTest = globalAccessToken?.startsWith("TEST-");

    // Verificar credenciales OAuth
    const oauthAccessToken = oauthConfig?.accessToken;
    const oauthIsTest = oauthAccessToken?.startsWith("TEST-");

    // LÓGICA DE PRIORIDAD: Preferir TEST para desarrollo
    if (globalIsTest) {
      accessToken = globalAccessToken;
      credentialSource = "global-test";
      console.log("🧪 [PROCESS-PAYMENT] Usando credenciales globales TEST para desarrollo");
    } else if (oauthIsTest) {
      accessToken = oauthAccessToken;
      credentialSource = "oauth-test";
      console.log("🧪 [PROCESS-PAYMENT] Usando credenciales OAuth TEST");
    } else if (oauthAccessToken) {
      accessToken = oauthAccessToken;
      credentialSource = "oauth-prod";
      console.log("🏭 [PROCESS-PAYMENT] Usando credenciales OAuth PRODUCCIÓN");
    } else if (globalAccessToken) {
      accessToken = globalAccessToken;
      credentialSource = "global-prod";
      console.log("🏭 [PROCESS-PAYMENT] Usando credenciales globales PRODUCCIÓN");
    }

    if (!accessToken) {
      console.error("❌ [PROCESS-PAYMENT] No se encontraron credenciales válidas");
      return NextResponse.json(
        {
          error: "MercadoPago no está configurado",
          details: "No se encontraron credenciales válidas",
        },
        { status: 400 },
      );
    }

    console.log("🔑 [PROCESS-PAYMENT] Credenciales seleccionadas:", {
      source: credentialSource,
      isTest: accessToken.startsWith("TEST-"),
      tokenPrefix: `${accessToken.substring(0, 20)}...`,
    });

    // 🔍 FUNCIÓN HELPER: Determinar tipo de tarjeta según payment_method_id
    const getCardType = (paymentMethodId: string): string => {
      const creditCards = ["visa", "master", "amex", "diners", "hipercard", "elo"];
      const debitCards = ["debvisa", "debmaster", "debelo"];

      if (creditCards.includes(paymentMethodId)) return "credit_card";
      if (debitCards.includes(paymentMethodId)) return "debit_card";
      return "credit_card"; // Default
    };

    // 🆕 NUEVA ESTRUCTURA PARA API DE ORDERS - VERIFICADA CONTRA DOCUMENTACIÓN OFICIAL
    const orderData = {
      // ✅ CAMPOS REQUERIDOS según documentación
      type: "online", // REQUERIDO: Tipo de order para pagos online
      external_reference:
        body.external_reference || `better-${session.user.organizationId}-${Date.now()}`,
      total_amount: body.amount.toString(), // REQUERIDO: Monto total como string
      processing_mode: "automatic", // REQUERIDO: Procesamiento automático

      // ✅ INFORMACIÓN DEL PAGADOR (todos los campos según documentación)
      payer: {
        email: body.payer.email, // REQUERIDO
        entity_type: "individual", // REQUERIDO: Tipo de entidad
        first_name: body.payer.first_name || "Cliente",
        last_name: body.payer.last_name || "Better",
        identification: body.payer.identification || {
          type: "DNI",
          number: "12345678",
        },
        phone: {
          area_code: body.payer.phone?.area_code || "11",
          number: body.payer.phone?.number || "12345678",
        },
        address: {
          zip_code: body.payer.address?.zip_code || "1043",
          street_name: body.payer.address?.street_name || "Av. Corrientes",
          street_number: body.payer.address?.street_number?.toString() || "1234",
          neighborhood: "Centro", // REQUERIDO según documentación
          city: "Buenos Aires", // REQUERIDO según documentación
          state: "Buenos Aires", // REQUERIDO según documentación
          complement: body.payer.address ? "Depto" : "", // OPCIONAL
        },
      },

      // ✅ TRANSACCIONES (estructura exacta según documentación)
      transactions: {
        payments: [
          {
            amount: body.amount.toString(), // REQUERIDO como string
            payment_method: {
              id: body.payment_method_id, // REQUERIDO
              type: getCardType(body.payment_method_id), // REQUERIDO: credit_card/debit_card
              token: body.token, // REQUERIDO para tarjetas
              installments: body.installments, // REQUERIDO
              statement_descriptor: "BETTER-MOTOS", // OPCIONAL: Aparece en resumen
              ...(body.issuer_id && { issuer_id: body.issuer_id }), // OPCIONAL: Solo si viene del frontend
            },
          },
        ],
      },

      // ✅ CAMPOS OPCIONALES PERO RECOMENDADOS
      description: body.description,
      capture_mode: "automatic_async", // Captura automática asíncrona
      marketplace: "NONE", // Para indicar que no es marketplace

      // ✅ ITEMS DETALLADOS (mejora aprobación)
      items: [
        {
          title: body.description,
          unit_price: body.amount.toString(),
          quantity: 1,
          description: `${body.description} - Venta de motocicleta Better`,
          external_code: body.metadata?.motorcycle_id || `moto-${Date.now()}`,
          category_id: "vehicles", // Categoría de vehículos
          type: "physical", // Tipo de producto físico
          warranty: true, // Producto con garantía
        },
      ],

      // ✅ DATOS DE INTEGRACIÓN
      integration_data: {
        integrator_id: "better-motos",
        platform_id: "better-platform",
        sponsor: {
          id: session.user.organizationId,
        },
      },
    };

    console.log("📋 [PROCESS-PAYMENT] === ESTRUCTURA DE ORDER FINAL ===");
    console.log("📋 [PROCESS-PAYMENT] Order Data completa:", JSON.stringify(orderData, null, 2));

    // Validaciones adicionales
    console.log("🔍 [PROCESS-PAYMENT] === VALIDACIONES ===");
    console.log("🔍 [PROCESS-PAYMENT] Email válido:", /\S+@\S+\.\S+/.test(orderData.payer.email));
    console.log(
      "🔍 [PROCESS-PAYMENT] Monto mayor a 0:",
      Number.parseFloat(orderData.total_amount) > 0,
    );
    console.log(
      "🔍 [PROCESS-PAYMENT] Token presente:",
      !!orderData.transactions.payments[0].payment_method.token,
    );
    console.log(
      "🔍 [PROCESS-PAYMENT] Payment method ID:",
      orderData.transactions.payments[0].payment_method.id,
    );
    console.log(
      "🔍 [PROCESS-PAYMENT] Card type detectado:",
      orderData.transactions.payments[0].payment_method.type,
    );

    console.log("🚀 [PROCESS-PAYMENT] === ENVIANDO A MERCADOPAGO ===");
    console.log("🚀 [PROCESS-PAYMENT] URL:", "https://api.mercadopago.com/v1/orders");
    console.log("🚀 [PROCESS-PAYMENT] Headers:", {
      Authorization: `Bearer ${accessToken.substring(0, 20)}...`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `${session.user.organizationId}-${Date.now()}`,
    });

    // 🆕 NUEVO ENDPOINT: /v1/orders (en lugar de /v1/payments)
    const response = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `${session.user.organizationId}-${Date.now()}-${Math.random()}`,
      },
      body: JSON.stringify(orderData),
    });

    const orderResult = await response.json();

    console.log("📥 [PROCESS-PAYMENT] === RESPUESTA DE MERCADOPAGO ===");
    console.log("📥 [PROCESS-PAYMENT] Status HTTP:", response.status);
    console.log("📥 [PROCESS-PAYMENT] Response completa:", JSON.stringify(orderResult, null, 2));

    if (!response.ok) {
      console.error("❌ [PROCESS-PAYMENT] ERROR DE MERCADOPAGO:", {
        status: response.status,
        statusText: response.statusText,
        error: orderResult,
        requestData: orderData,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Error al procesar el pago",
          details: orderResult.message || "Error de comunicación con MercadoPago",
          mercadopago_error: orderResult,
          debug_info: {
            credential_source: credentialSource,
            is_test: accessToken.startsWith("TEST-"),
            request_data: orderData,
          },
        },
        { status: 400 },
      );
    }

    console.log("✅ [PROCESS-PAYMENT] === PROCESAMIENTO EXITOSO ===");
    console.log("✅ [PROCESS-PAYMENT] Order ID:", orderResult.id);
    console.log("✅ [PROCESS-PAYMENT] Status:", orderResult.status);
    console.log("✅ [PROCESS-PAYMENT] Status Detail:", orderResult.status_detail);
    console.log("✅ [PROCESS-PAYMENT] Processing Mode:", orderResult.processing_mode);

    // 🆕 NUEVA ESTRUCTURA DE RESPUESTA (Orders API)
    const payment = orderResult.transactions?.payments?.[0];

    if (payment) {
      console.log("💰 [PROCESS-PAYMENT] Payment Info:", {
        paymentId: payment.id,
        amount: payment.amount,
        paidAmount: payment.paid_amount,
        status: payment.status,
        statusDetail: payment.status_detail,
        paymentMethodId: payment.payment_method?.id,
      });
    }

    const finalResponse = {
      success: true,
      order: {
        id: orderResult.id,
        status: orderResult.status,
        status_detail: orderResult.status_detail,
        total_amount: orderResult.total_amount,
        total_paid_amount: orderResult.total_paid_amount,
        external_reference: orderResult.external_reference,
        processing_mode: orderResult.processing_mode,
      },
      payment: payment
        ? {
            id: payment.id,
            status: payment.status,
            status_detail: payment.status_detail,
            amount: payment.amount,
            paid_amount: payment.paid_amount,
            payment_method_id: payment.payment_method?.id,
            installments: payment.payment_method?.installments,
          }
        : null,
      debug_info: {
        credential_source: credentialSource,
        is_test: accessToken.startsWith("TEST-"),
      },
    };

    console.log("📤 [PROCESS-PAYMENT] === RESPUESTA FINAL AL FRONTEND ===");
    console.log("📤 [PROCESS-PAYMENT] Final Response:", JSON.stringify(finalResponse, null, 2));

    return NextResponse.json(finalResponse);
  } catch (error) {
    console.error("💥 [PROCESS-PAYMENT] === ERROR CRÍTICO ===");
    console.error("💥 [PROCESS-PAYMENT] Error completo:", error);
    console.error(
      "💥 [PROCESS-PAYMENT] Stack trace:",
      error instanceof Error ? error.stack : "No stack trace",
    );

    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
        debug_info: {
          error_type: error instanceof Error ? error.constructor.name : typeof error,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
}
