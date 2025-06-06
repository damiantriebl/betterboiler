import { type NextRequest, NextResponse } from "next/server";

interface CancelOrderParams {
  params: Promise<{ orderId: string }>;
}

export async function POST(request: NextRequest, { params }: CancelOrderParams) {
  try {
    const { orderId } = await params;

    console.log("🚫 [POINT-CANCEL] === INICIO CANCELACIÓN ===");
    console.log("🚫 [POINT-CANCEL] Order ID:", orderId);

    // Debug bypass
    const debugKey = request.headers.get("x-debug-key");
    const isDebugMode = debugKey === "DEBUG_KEY";

    if (!isDebugMode) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener configuración OAuth desde la API existente
    const configResponse = await fetch(
      `${request.nextUrl.origin}/api/configuration/mercadopago/organization/cmbggeh3l0000lhqsxwreokun`,
      {
        headers: { "x-debug-key": "DEBUG_KEY" },
      }
    );

    if (!configResponse.ok) {
      console.error("❌ [POINT-CANCEL] Error obteniendo configuración");
      return NextResponse.json(
        { error: "Configuración de MercadoPago no encontrada" },
        { status: 404 }
      );
    }

    const config = await configResponse.json();
    const accessToken = config.accessToken;

    if (!accessToken) {
      console.error("❌ [POINT-CANCEL] No se encontró access token");
      return NextResponse.json(
        { error: "Access token de MercadoPago no encontrado" },
        { status: 404 }
      );
    }

    console.log("🔑 [POINT-CANCEL] Access Token:", `${accessToken.substring(0, 20)}...`);

    // Cancelar usando el endpoint correcto de Orders API v1
    const cancelResponse = await fetch(`https://api.mercadopago.com/v1/orders/${orderId}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `cancel-${orderId}-${Date.now()}`,
      },
    });

    const cancelResult = await cancelResponse.json();

    console.log("📥 [POINT-CANCEL] === RESPUESTA DE MERCADOPAGO ===");
    console.log("📥 [POINT-CANCEL] Status HTTP:", cancelResponse.status);
    console.log("📥 [POINT-CANCEL] Response:", JSON.stringify(cancelResult, null, 2));

    if (!cancelResponse.ok) {
      console.error("❌ [POINT-CANCEL] Error cancelando order:", {
        status: cancelResponse.status,
        error: cancelResult,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Error cancelando order",
          details: cancelResult.message || "Error de comunicación con MercadoPago",
          mercadopago_error: cancelResult,
        },
        { status: 400 }
      );
    }

    console.log("✅ [POINT-CANCEL] === CANCELACIÓN EXITOSA ===");
    console.log("✅ [POINT-CANCEL] Order cancelada:", cancelResult.id);
    console.log("✅ [POINT-CANCEL] Nuevo status:", cancelResult.status);

    return NextResponse.json({
      success: true,
      order: {
        id: cancelResult.id,
        status: cancelResult.status,
        status_detail: cancelResult.status_detail,
        external_reference: cancelResult.external_reference,
        canceled_at: cancelResult.last_updated_date,
      },
      message: "Order cancelada exitosamente",
    });
  } catch (error) {
    console.error("💥 [POINT-CANCEL] === ERROR CRÍTICO ===");
    console.error("💥 [POINT-CANCEL] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
} 