import { validateOrganizationAccess } from "@/actions/util";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("🏪 [CreatePointPayment] Creando intención de pago...");

    // Validar acceso a la organización
    const { organizationId, error } = await validateOrganizationAccess();
    if (error || !organizationId) {
      console.error("❌ [CreatePointPayment] Error de organización:", error);
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Parsear body de la request
    const body = await request.json();
    const { amount, description, device_id, external_reference, metadata } = body;

    if (!amount || !description || !device_id) {
      return NextResponse.json(
        {
          error: "Faltan parámetros requeridos: amount, description, device_id",
        },
        { status: 400 },
      );
    }

    // Obtener configuración usando lógica unificada (igual que devices endpoint)
    const configResponse = await fetch(
      `${request.nextUrl.origin}/api/configuration/mercadopago/organization/${organizationId}`,
      {
        headers: {
          "x-debug-key": "DEBUG_KEY", // Bypass para debug
        },
      },
    );

    if (!configResponse.ok) {
      console.error("❌ [CreatePointPayment] Error obteniendo configuración:", {
        status: configResponse.status,
        statusText: configResponse.statusText,
      });
      return NextResponse.json(
        { error: "Configuración de MercadoPago no encontrada" },
        { status: 404 },
      );
    }

    const { accessToken, environment, credentialSource } = await configResponse.json();
    if (!accessToken) {
      return NextResponse.json({ error: "Access token no configurado" }, { status: 404 });
    }

    // ✅ Estructura MÍNIMA para Point Smart - Solo propiedades soportadas
    // Basado en errores reales de la API: NO incluir total_amount, notification_url, currency_id, description, payment_method
    const orderData = {
      type: "point", // REQUERIDO: Tipo de order para Point Smart
      external_reference: external_reference || `point-${Date.now()}`,
      
      // Configuración específica de Point Smart
      config: {
        point: {
          terminal_id: device_id, // ID del dispositivo Point Smart
          print_on_terminal: "no_ticket", // No imprimir ticket automáticamente
        },
      },

      // Transacciones SIMPLIFICADAS - Solo amount sin propiedades adicionales
      transactions: {
        payments: [
          {
            amount: (amount / 100).toFixed(2), // Solo monto, sin currency_id, description, payment_method
          },
        ],
      },
      
      // ❌ NOTA: Point Smart NO acepta notification_url - Solo funciona con polling
    };

    console.log("📤 [CreatePointPayment] Enviando Order SIMPLIFICADA a MercadoPago v1:", {
      terminal_id: device_id,
      amount: amount,
      description: description,
      external_reference: external_reference,
      orderData: orderData,
      note: "Estructura MÍNIMA - Point Smart NO acepta notification_url",
    });

    const mpResponse = await fetch(
      "https://api.mercadopago.com/v1/orders", // ✅ API v1/orders oficial
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": `po-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Máximo 64 chars
        },
        body: JSON.stringify(orderData),
      },
    );

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("❌ [CreatePointPayment] Error de MercadoPago:", mpResponse.status, mpData);
      return NextResponse.json(
        {
          error: "Error creando intención de pago",
          details: mpData.message || `HTTP ${mpResponse.status}`,
          mercadopago_error: mpData,
        },
        { status: mpResponse.status },
      );
    }

    console.log("✅ [CreatePointPayment] Order creada exitosamente:", mpData);

    // Extraer información del primer payment de la order
    const payment = mpData.transactions?.payments?.[0];

    return NextResponse.json({
      success: true,
      order_id: mpData.id, // ID de la order (no payment intent)
      payment_id: payment?.id, // ID del payment dentro de la order
      device_id: device_id,
      amount: amount,
      status: mpData.status || "created",
      payment_status: payment?.status || "pending",
      terminal_id: mpData.config?.point?.terminal_id,
      additional_info: mpData,
    });
  } catch (error) {
    console.error("❌ [CreatePointPayment] Error interno:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
