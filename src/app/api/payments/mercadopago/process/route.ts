import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, formData, amount, description, payer } = body;

    console.log("💳 [MERCADOPAGO-PROCESS] === INICIO DE PROCESAMIENTO (MIGRADO A ORDERS) ===");
    console.log("💳 [MERCADOPAGO-PROCESS] Datos recibidos:", {
      organizationId,
      amount,
      description,
    });

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID requerido" }, { status: 400 });
    }

    // Obtener la configuración OAuth de esta organización
    const oauthConfig = await prisma.mercadoPagoOAuth.findUnique({
      where: {
        organizationId: organizationId,
      },
    });

    if (!oauthConfig) {
      console.error(
        "❌ [MERCADOPAGO-PROCESS] OAuth no configurado para organización:",
        organizationId,
      );
      return NextResponse.json(
        { error: "Mercado Pago no está conectado para esta organización" },
        { status: 400 },
      );
    }

    console.log("🔑 [MERCADOPAGO-PROCESS] OAuth encontrado para organización");

    // 🔍 FUNCIÓN HELPER: Determinar tipo de tarjeta según payment_method_id
    const getCardType = (paymentMethodId: string): string => {
      const creditCards = ["visa", "master", "amex", "diners", "hipercard", "elo"];
      const debitCards = ["debvisa", "debmaster", "debelo"];

      if (creditCards.includes(paymentMethodId)) return "credit_card";
      if (debitCards.includes(paymentMethodId)) return "debit_card";
      return "credit_card"; // Default
    };

    // 🆕 NUEVA ESTRUCTURA PARA API DE ORDERS (migrado desde payments)
    const orderData = {
      // ✅ CAMPOS REQUERIDOS según documentación
      type: "online", // REQUERIDO: Tipo de order para pagos online
      external_reference: `org-${organizationId}-process-${Date.now()}`,
      total_amount: amount.toString(), // REQUERIDO: Monto total como string
      processing_mode: "automatic", // REQUERIDO: Procesamiento automático

      // ✅ INFORMACIÓN DEL PAGADOR
      payer: {
        email: payer.email, // REQUERIDO
        entity_type: "individual", // REQUERIDO: Tipo de entidad
        first_name: payer.firstName || "Cliente",
        last_name: payer.lastName || "Better",
        identification: payer.identification || {
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

      // ✅ TRANSACCIONES (estructura exacta según documentación)
      transactions: {
        payments: [
          {
            amount: amount.toString(), // REQUERIDO como string
            payment_method: {
              id: formData.payment_method_id, // REQUERIDO
              type: getCardType(formData.payment_method_id), // REQUERIDO: credit_card/debit_card
              token: formData.token, // REQUERIDO para tarjetas
              installments: formData.installments || 1, // REQUERIDO
              statement_descriptor: description.substring(0, 22), // OPCIONAL: Máximo 22 caracteres
              ...(formData.issuer_id && { issuer_id: formData.issuer_id }), // OPCIONAL: Solo si viene del frontend
            },
          },
        ],
      },

      // ✅ CAMPOS OPCIONALES PERO RECOMENDADOS
      description: description,
      capture_mode: "automatic_async", // Captura automática asíncrona
      marketplace: "NONE", // Para indicar que no es marketplace

      // ✅ ITEMS DETALLADOS (mejora aprobación)
      items: [
        {
          title: description,
          unit_price: amount.toString(),
          quantity: 1,
          description: `${description} - Procesado via Better`,
          external_code: `process-${Date.now()}`,
          category_id: "others", // Categoría general
          type: "digital", // Tipo de producto
          warranty: false,
        },
      ],

      // ✅ DATOS DE INTEGRACIÓN
      integration_data: {
        integrator_id: "better-process",
        platform_id: "better-platform",
        sponsor: {
          id: organizationId,
        },
      },
    };

    console.log(
      "📋 [MERCADOPAGO-PROCESS] Order Data preparada:",
      JSON.stringify(orderData, null, 2),
    );

    // 🆕 NUEVO ENDPOINT: /v1/orders (en lugar de /v1/payments)
    const orderResponse = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${oauthConfig.accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `process-${organizationId}-${Date.now()}`, // Para evitar órdenes duplicadas
      },
      body: JSON.stringify(orderData),
    });

    const orderResult = await orderResponse.json();

    console.log("📥 [MERCADOPAGO-PROCESS] Respuesta de MercadoPago Orders API:", {
      status: orderResponse.status,
      ok: orderResponse.ok,
      orderId: orderResult.id,
    });

    if (!orderResponse.ok) {
      console.error("❌ [MERCADOPAGO-PROCESS] Error de Mercado Pago:", orderResult);
      return NextResponse.json(
        {
          error: "Error procesando el pago",
          details: orderResult,
        },
        { status: orderResponse.status },
      );
    }

    // El pago se procesó exitosamente - Extraer información del payment
    const payment = orderResult.transactions?.payments?.[0];

    console.log("✅ [MERCADOPAGO-PROCESS] Order procesada exitosamente:", {
      orderId: orderResult.id,
      paymentId: payment?.id,
      status: payment?.status,
    });

    return NextResponse.json({
      success: true,
      // Mantener compatibilidad con el formato anterior
      payment_id: payment?.id,
      status: payment?.status,
      status_detail: payment?.status_detail,
      amount: payment?.amount,
      currency: "ARS", // Asumido por Argentina
      payment_method: payment?.payment_method?.id,
      installments: payment?.payment_method?.installments,
      external_reference: orderResult.external_reference,
      // Nueva información de Orders API
      order: {
        id: orderResult.id,
        total_amount: orderResult.total_amount,
        processing_mode: orderResult.processing_mode,
        status: orderResult.status,
      },
    });
  } catch (error) {
    console.error("💥 [MERCADOPAGO-PROCESS] Error procesando pago:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
